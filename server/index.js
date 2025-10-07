// server/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    res.send('🚀 BSSN Cerdas Triage Server is running!');
});

// --- Konfigurasi & Variabel Global ---
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Batas file 10MB
});

const BYTEPLUS_MODELARK_API_KEY = process.env.BYTEPLUS_MODELARK_API_KEY;
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;

if (!BYTEPLUS_MODELARK_API_KEY) {
    throw new Error("BYTEPLUS_MODELARK_API_KEY not found in .env file");
}

const MODELARK_CHAT_API_URL = "https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions";
const TEXT_MODEL_NAME = "seed-1-6-250615";
const VISION_MODEL_NAME = "seed-1-6-250615"; // [CATATAN]: Pastikan ini adalah nama model VLM yang benar

// =================================================================================
// FUNGSI-FUNGSI HELPER & UTAMA
// =================================================================================

/**
 * Membangun prompt akhir dengan menyuntikkan contoh dari knowledge base.
 * @param {string} basePrompt - Prompt dasar untuk insiden saat ini.
 * @param {string} knowledgeString - String JSON dari knowledge base.
 * @returns {string} Prompt yang sudah diperkaya.
 */
function buildPromptWithKnowledge(basePrompt, knowledgeString) {
    let knowledge = [];
    try {
        // Parsing string JSON yang diterima dari frontend
        if (knowledgeString) knowledge = JSON.parse(knowledgeString);
    } catch (e) {
        console.error("Gagal mem-parsing knowledge base JSON:", e.message);
    }

    if (!knowledge || knowledge.length === 0) {
        return basePrompt;
    }

    const examples = knowledge.slice(-2).map(c => 
        `CONTOH KASUS:\n- Input Anomali: "${c.input}"\n- Output Analisis Ideal: "${c.output}"`
    ).join('\n---\n');

    return `Anda adalah seorang ahli keamanan siber BSSN. Gunakan contoh-contoh kasus berikut dari knowledge base sebagai referensi utama untuk gaya, format, dan kedalaman analisis Anda.\n\n---\n${examples}\n---\n\nSekarang, berikan analisis untuk insiden BARU berikut:\n\n${basePrompt}`;
}

/**
 * Menghubungi microservice Python untuk mendeteksi anomali menggunakan model ML.
 * @param {string} logContent - Konten log mentah.
 * @returns {object} Objek incident_details yang berisi anomali.
 */
async function detectAnomaliesWithML(logContent) {
    const logLines = logContent.split('\n').filter(line => line.trim() !== '');
    const mlServiceUrl = 'http://localhost:5002/detect';

    if (logLines.length === 0) {
        return { timestamp: new Date().toISOString(), anomalies_found: ["Input log kosong."], raw_log_excerpt: "" };
    }

    try {
        console.log(`[Node Backend] Mengirim ${logLines.length} baris log ke ML Service...`);
        const response = await axios.post(mlServiceUrl, { logs: logLines });
        
        const rawAnomalies = response.data.anomalies || [];
        console.log(`[Node Backend] Menerima ${rawAnomalies.length} anomali mentah dari ML Service.`);
        
        // [MODIFIKASI] Panggil fungsi peringkasan di sini!
        const summarizedAnomalies = summarizeAnomalies(rawAnomalies);

        const incident_details = {
            timestamp: new Date().toISOString(),
            anomalies_found: summarizedAnomalies, // Gunakan anomali yang sudah diringkas
            raw_log_excerpt: logContent.substring(0, 1000) + (logContent.length > 1000 ? "..." : "") // Perpanjang sedikit cuplikan
        };
        
        return incident_details;

    } catch (error) {
        console.error("[Node Backend] Gagal menghubungi ML service:", error.message);
        return {
            timestamp: new Date().toISOString(),
            anomalies_found: ["KRITIS: Gagal terhubung ke ML Service untuk deteksi anomali."],
            raw_log_excerpt: logContent.substring(0, 500) + (logContent.length > 500 ? "..." : "")
        };
    }
}

/**
 * Memanggil ModelArk untuk analisis teks.
 * @param {object} incident_data - Data insiden dari detektor anomali.
 * @param {string} knowledgeString - String JSON dari knowledge base.
 * @returns {string} Respons dari ModelArk.
 */
async function invoke_modelark(incident_data, knowledgeString) {
    const basePrompt = `
    Sebagai seorang ahli keamanan siber BSSN, Anda diminta untuk menganalisis insiden siber berikut dan memberikan:
    1. Narasi insiden yang koheren dan mudah dipahami.
    2. Minimal 3 rekomendasi tindakan real-time yang cerdas dan prioritas.

    Detail Insiden:
    Anomalies Found: ${incident_data.anomalies_found.join(', ')}
    Raw Log Excerpt: ${incident_data.raw_log_excerpt}
    `;

    const finalPrompt = buildPromptWithKnowledge(basePrompt, knowledgeString);

    const payload = { model: TEXT_MODEL_NAME, messages: [{ role: "user", content: finalPrompt }], temperature: 0.7, max_tokens: 1024 };
    try {
        const response = await axios.post(MODELARK_CHAT_API_URL, { ...payload }, { headers: { "Authorization": `Bearer ${BYTEPLUS_MODELARK_API_KEY}` } });
        return response.data?.choices?.[0]?.message?.content || "Gagal mendapatkan respons valid dari ModelArk.";
    } catch (error) {
        console.error("Error invoking ModelArk (Text):", error.response ? error.response.data : error.message);
        return `Terjadi kesalahan saat memanggil API Teks ModelArk: ${error.message}`;
    }
}
 /**
 *@param {string[]} anomalies - Array berisi string anomali.
 * @returns {string[]} Array anomali yang sudah diringkas.
 */
function summarizeAnomalies(anomalies) {
    const MAX_ANOMALIES_TO_SEND = 100; // Batas maksimal anomali yang dikirim ke LLM
    const SAMPLE_SIZE = 25; // Jumlah sampel dari awal dan akhir

    if (anomalies.length <= MAX_ANOMALIES_TO_SEND) {
        return anomalies; // Jika anomali sedikit, kirim semua
    }

    console.log(`[Intelijen Peringkasan] Meringkas ${anomalies.length} anomali menjadi ${SAMPLE_SIZE * 2} sampel.`);

    const summary = [
        `[RINGKASAN] Terdeteksi total ${anomalies.length} anomali oleh model ML. Berikut adalah sampelnya:`,
        "--- CONTOH ANOMALI AWAL ---"
    ];

    const firstSamples = anomalies.slice(0, SAMPLE_SIZE);
    const lastSamples = anomalies.slice(-SAMPLE_SIZE);

    summary.push(...firstSamples);
    summary.push("--- ( ... data dipotong ... ) ---");
    summary.push("--- CONTOH ANOMALI AKHIR ---");
    summary.push(...lastSamples);

    return summary;
}


/**
 * Memanggil ModelArk untuk analisis gambar (VLM).
 * @param {string} base64Image - Gambar dalam format Base64.
 * @param {string} imageType - Tipe MIME gambar (e.g., 'image/png').
 * @param {string} knowledgeString - String JSON dari knowledge base.
 * @returns {string} Respons dari ModelArk.
 */
async function invoke_modelark_vision(base64Image, imageType, knowledgeString) {
    const basePrompt = `
    Anda adalah seorang analis keamanan siber senior di BSSN. Analisis gambar berikut sebagai bukti insiden siber.
    Berikan laporan dalam format:
    1.  **Deskripsi Gambar:**
    2.  **Identifikasi Potensi Ancaman:** (Termasuk IoC jika ada)
    3.  **Tingkat Keparahan (Estimasi):**
    4.  **Rekomendasi Tindakan Awal:**
    `;

    const finalPrompt = buildPromptWithKnowledge(basePrompt, knowledgeString);
    
    const payload = {
        model: VISION_MODEL_NAME,
        messages: [{
            role: "user",
            content: [
                { type: "text", text: finalPrompt },
                { type: "image_url", image_url: { "url": `data:${imageType};base64,${base64Image}` } }
            ]
        }],
        temperature: 0.5,
        max_tokens: 1024
    };

    try {
        const response = await axios.post(MODELARK_CHAT_API_URL, payload, { headers: { "Authorization": `Bearer ${BYTEPLUS_MODELARK_API_KEY}` } });
        return response.data?.choices?.[0]?.message?.content || "Gagal mendapatkan respons valid dari Model VLM.";
    } catch (error) {
        console.error("====================== ERROR KONEKSI KE MODEL VLM ======================");
        if (error.response) {
            console.error("STATUS CODE:", error.response.status);
            console.error("DATA ERROR:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
        console.error("========================================================================");
        return `Terjadi kesalahan saat memanggil API VLM ModelArk: ${error.message}`;
    }
}

// =================================================================================
// API ENDPOINTS
// =================================================================================

// Endpoint #1: Menerima input teks
app.post('/api/triage-text', async (req, res) => {
    const { logContent, knowledge } = req.body;
    if (!logContent || !logContent.trim()) {
        return res.status(400).json({ error: "Input log teks tidak boleh kosong." });
    }
    try {
        const incident_data = await detectAnomaliesWithML(logContent);
        const modelark_response = await invoke_modelark(incident_data, knowledge);
        res.json({ incident_data, modelark_response });
    } catch (error) {
        console.error("Error pada endpoint /api/triage-text:", error);
        res.status(500).json({ error: "Kesalahan server saat memproses teks." });
    }
});

// Endpoint #2: Menerima upload file log
app.post('/api/triage', upload.single('logFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "File log tidak ditemukan." });
    }
    const { knowledge } = req.body;
    const logContent = req.file.buffer.toString('utf-8');
    try {
        const incident_data = await detectAnomaliesWithML(logContent);
        const modelark_response = await invoke_modelark(incident_data, knowledge);
        res.json({ incident_data, modelark_response });
    } catch (error) {
        console.error("Error pada endpoint /api/triage (file):", error);
        res.status(500).json({ error: "Kesalahan server saat memproses file." });
    }
});

// Endpoint #3: Menerima upload file gambar
app.post('/api/triage-image', upload.single('imageFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "File gambar tidak ditemukan." });
    }
    const { knowledge } = req.body;
    const base64Image = req.file.buffer.toString('base64');
    const imageType = req.file.mimetype;
    try {
        const image_analysis = await invoke_modelark_vision(base64Image, imageType, knowledge);
        res.json({ image_analysis, image_data_url: `data:${imageType};base64,${base64Image}` });
    } catch (error) {
        console.error("Error pada endpoint /api/triage-image:", error);
        res.status(500).json({ error: "Kesalahan server saat memproses gambar." });
    }
});

// Endpoint #4: Cek reputasi IP
app.post('/api/check-ip', async (req, res) => {
    if (!VIRUSTOTAL_API_KEY) {
        return res.status(500).json({ error: "VIRUSTOTAL_API_KEY tidak dikonfigurasi." });
    }
    const { ip } = req.body;
    if (!ip) {
        return res.status(400).json({ error: "Alamat IP diperlukan." });
    }
    const options = {
        method: 'GET',
        url: `https://www.virustotal.com/api/v3/ip_addresses/${ip}`,
        headers: { 'accept': 'application/json', 'x-apikey': VIRUSTOTAL_API_KEY }
    };
    try {
        const response = await axios.request(options);
        const attr = response.data.data.attributes;
        res.json({
            owner: attr.as_owner,
            country: attr.country,
            reputation: attr.reputation,
            last_analysis_stats: attr.last_analysis_stats,
            last_analysis_date: new Date(attr.last_analysis_date * 1000).toLocaleString('id-ID')
        });
    } catch (error) {
        console.error("Error saat menghubungi VirusTotal API:", error.response ? error.response.data : error.message);
        res.status(error.response?.status || 500).json({ error: `Gagal memeriksa IP di VirusTotal.` });
    }
});

// =================================================================================
// SERVER LISTENER
// =================================================================================
app.listen(PORT, () => {
    console.log(`🚀 Server BSSN Cerdas Triage berjalan di http://localhost:${PORT}`);
});