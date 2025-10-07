// client/src/TriagePage.js

import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import logo from './assets/JangkarBesi_Logo.png';
import { Link } from 'react-router-dom';

function TriagePage({ onLogout }) {
    // =================================================================================
    // MANAJEMEN STATE (Tidak ada perubahan)
    // =================================================================================
    const [inputType, setInputType] = useState('file');
    const [selectedFile, setSelectedFile] = useState(null);
    const [logText, setLogText] = useState('');
    const [triageResult, setTriageResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showIocAnalysis, setShowIocAnalysis] = useState(false);
    const [ipCheckResults, setIpCheckResults] = useState({});
    const [checkingIp, setCheckingIp] = useState(null);

    // =================================================================================
    // FUNGSI LOGIKA DAN EVENT HANDLER (DENGAN PERBAIKAN PADA URL API)
    // =================================================================================
    const handleFileChange = (event) => { setSelectedFile(event.target.files[0]); setTriageResult(null); setError(''); };
    const handleTextChange = (event) => { setLogText(event.target.value); setTriageResult(null); setError(''); };
    const handleTabChange = (type) => { setInputType(type); setSelectedFile(null); setLogText(''); setTriageResult(null); setError(''); };
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');
        setTriageResult(null);
        setShowIocAnalysis(false);
        setIpCheckResults({});

        const knowledge = localStorage.getItem('jangkarbesi_knowledge_base') || '[]';
        const apiUrl = process.env.REACT_APP_API_URL; // Mengambil URL backend dari environment

        if (!apiUrl) {
            setError("Kesalahan Konfigurasi: URL API Backend tidak ditemukan. Pastikan environment variable sudah diatur.");
            setIsLoading(false);
            return;
        }

        try {
            let response;
            if (inputType === 'image') {
                if (!selectedFile) { setError('Silakan pilih file gambar terlebih dahulu.'); setIsLoading(false); return; }
                const formData = new FormData();
                formData.append('imageFile', selectedFile);
                formData.append('knowledge', knowledge);
                // [PERBAIKAN KRITIS]: Menggunakan URL absolut dari environment variable
                response = await axios.post(`${apiUrl}/api/triage-image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else if (inputType === 'file') {
                if (!selectedFile) { setError('Silakan pilih file log terlebih dahulu.'); setIsLoading(false); return; }
                const formData = new FormData();
                formData.append('logFile', selectedFile);
                formData.append('knowledge', knowledge);
                // [PERBAIKAN KRITIS]: Menggunakan URL absolut dari environment variable
                response = await axios.post(`${apiUrl}/api/triage`, formData);
            } else { // inputType === 'text'
                if (!logText.trim()) { setError('Silakan masukkan potongan log terlebih dahulu.'); setIsLoading(false); return; }
                // [PERBAIKAN KRITIS]: Menggunakan URL absolut dari environment variable
                response = await axios.post(`${apiUrl}/api/triage-text`, { 
                    logContent: logText, 
                    knowledge: knowledge 
                });
            }
            setTriageResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Gagal memproses permintaan. Periksa koneksi server.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleIpCheck = async (ip) => {
        const apiUrl = process.env.REACT_APP_API_URL;
        setCheckingIp(ip);
        try {
            // [PERBAIKAN KRITIS]: Menggunakan URL absolut dari environment variable
            const response = await axios.post(`${apiUrl}/api/check-ip`, { ip });
            setIpCheckResults(prevResults => ({
                ...prevResults,
                [ip]: { data: response.data, error: null }
            }));
        } catch (err) {
            const errorMessage = err.response?.data?.error || `Gagal memeriksa IP ${ip}.`;
            setIpCheckResults(prevResults => ({
                ...prevResults,
                [ip]: { data: null, error: errorMessage }
            }));
        } finally {
            setCheckingIp(null);
        }
    };

    // =================================================================================
    // STRUKTUR TAMPILAN (JSX RENDER) - (Tidak ada perubahan di sini)
    // =================================================================================
    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-logo-container">
                    <img src={logo} alt="Logo" className="header-logo" />
                    <span>JangkarBesi AI Triage</span>
                    <nav className="header-nav">
                        <Link to="/knowledge-base">Knowledge Base</Link>
                    </nav>
                </div>
                <button onClick={onLogout} className="logout-button">Logout</button>
            </header>
            <main className="container">
                <h1>BSSN Cerdas Triage - JangkarBesi</h1>
                <p>Sistem Analisis Insiden Siber Otomatis berbasis AI</p>
                
                <div className="input-tabs">
                    <button className={`tab-button ${inputType === 'file' ? 'active' : ''}`} onClick={() => handleTabChange('file')}>Upload Log</button>
                    <button className={`tab-button ${inputType === 'text' ? 'active' : ''}`} onClick={() => handleTabChange('text')}>Input Teks</button>
                    <button className={`tab-button ${inputType === 'image' ? 'active' : ''}`} onClick={() => handleTabChange('image')}>Analisis Gambar</button>
                </div>
                <form onSubmit={handleSubmit}>
                     {inputType === 'image' ? ( <div className="input-area"><label htmlFor="image_input">Pilih Gambar Insiden (.png, .jpg, .jpeg):</label><input type="file" id="image_input" name="image_input" onChange={handleFileChange} accept="image/png,image/jpeg,image/jpg" /></div> ) : inputType === 'file' ? ( <div className="input-area"><label htmlFor="log_input">Pilih File Log (.txt, .csv, .log):</label><input type="file" id="log_input" name="log_input" onChange={handleFileChange} accept=".txt,.csv,.log" /></div> ) : ( <div className="input-area"><label htmlFor="log_textarea">Tempel (Paste) Cuplikan Log di Sini:</label><textarea id="log_textarea" value={logText} onChange={handleTextChange} placeholder="Contoh: [2025-10-02 10:00:00] Failed login attempt..." rows="8"></textarea></div> )}
                    <button type="submit" disabled={isLoading}>{isLoading ? 'Memproses...' : 'Proses Triage'}</button>
                </form>
                {error && <p className="error-message">{error}</p>}
                {isLoading && <div className="loader"></div>}
                {triageResult && ( <div className="result-section"><h2>Hasil Triage:</h2>{triageResult.image_analysis && ( <div className="image-analysis-result"><h3>Analisis dari Gambar:</h3><div className="result-box modelark-response"><pre>{triageResult.image_analysis}</pre></div><h3>Gambar yang Dianalisis:</h3><img src={triageResult.image_data_url} alt="Incident Screenshot" className="triage-image" /></div> )}{triageResult.incident_data && ( <><h3>Data Insiden Terdeteksi (Simulasi):</h3><div className="result-box"><p><strong>Timestamp:</strong> {triageResult.incident_data.timestamp}</p><p><strong>Anomali Ditemukan:</strong> {triageResult.incident_data.anomalies_found.join(', ')}</p><p><strong>Cuplikan Log Mentah:</strong></p><pre className="raw-log">{triageResult.incident_data.raw_log_excerpt}</pre></div><h3>Respons dari BytePlus ModelArk:</h3><div className="result-box modelark-response"><pre>{triageResult.modelark_response}</pre></div> {(() => { const foundIps = [...new Set((triageResult.incident_data.raw_log_excerpt || '').match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) || [])]; if (foundIps.length === 0) return null; if (!showIocAnalysis) { return ( <div className="ioc-prompt"><button className="action-button" onClick={() => setShowIocAnalysis(true)}>Lanjutkan Analisis Reputasi IoC</button></div> ); } return ( <><h3>Analisis Reputasi IoC:</h3><div className="result-box ioc-analysis"><ul className="ioc-list">{foundIps.map(ip => ( <li key={ip}><span className="ioc-item">{ip}</span><button className="check-button" onClick={() => handleIpCheck(ip)} disabled={checkingIp === ip}>{checkingIp === ip ? 'Memeriksa...' : 'Cek Reputasi (VirusTotal)'}</button>{ipCheckResults[ip] && ( <div className="reputation-result">{ipCheckResults[ip].error ? ( <p className="error-text">{ipCheckResults[ip].error}</p> ) : ( <> <p><strong>Owner:</strong> {ipCheckResults[ip].data.owner}</p> <p><strong>Skor Analisis (Malicious / Total):</strong><span className={`score-${ipCheckResults[ip].data.last_analysis_stats.malicious > 0 ? 'malicious' : 'clean'}`}>{ipCheckResults[ip].data.last_analysis_stats.malicious} / {Object.values(ipCheckResults[ip].data.last_analysis_stats).reduce((a, b) => a + b, 0)}</span></p> <p><strong>Update Terakhir:</strong> {ipCheckResults[ip].data.last_analysis_date}</p> </> )}</div> )}</li> ))}</ul></div></> ); })()} </> )}</div> )}
                 <footer><p>&copy; 2025 JangkarBesi - BSSN Cerdas Triage</p></footer>
            </main>
        </div>
    );
}

export default TriagePage;