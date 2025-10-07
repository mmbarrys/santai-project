# ml_service/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import IsolationForest
import numpy as np

# Inisialisasi aplikasi Flask
app = Flask(__name__)
# Mengizinkan Cross-Origin Resource Sharing agar bisa diakses oleh backend Node.js
CORS(app)

# --- Fungsi Feature Engineering ---
# Model Machine Learning membutuhkan input numerik, bukan teks mentah.
# Fungsi ini mengekstrak fitur numerik sederhana dari setiap baris log.
def extract_features(log_lines):
    features = []
    for line in log_lines:
        # Fitur 1: Panjang total baris log. Anomali seringkali memiliki panjang yang tidak biasa.
        length = len(line)
        # Fitur 2: Jumlah digit angka dalam baris. Aktivitas anomali bisa memiliki banyak angka (ID, port, dll).
        num_digits = sum(c.isdigit() for c in line)
        # Fitur 3: Jumlah karakter non-alfanumerik. Kode berbahaya atau obfuscated sering menggunakan banyak simbol.
        num_special_chars = sum(not c.isalnum() for c in line)
        
        features.append([length, num_digits, num_special_chars])
    return np.array(features)

# --- Endpoint API ---
# Endpoint ini akan menerima daftar log dan mengembalikan log yang dianggap anomali.
@app.route('/detect', methods=['POST'])
def detect_anomalies():
    # Ambil data JSON dari request
    data = request.json
    if not data or 'logs' not in data:
        return jsonify({"error": "Request body harus berisi JSON dengan key 'logs'"}), 400

    log_lines = data['logs']
    if not log_lines:
        return jsonify({"anomalies": []})

    try:
        # 1. Ekstrak fitur dari teks log menjadi data numerik
        features = extract_features(log_lines)

        # 2. Inisialisasi model Isolation Forest.
        # Ini adalah model unsupervised yang efektif untuk menemukan outlier (data ganjil).
        # 'contamination' di set ke 'auto' agar model bisa menentukan ambang batas anomali secara otomatis.
        # 'random_state' digunakan agar hasilnya konsisten setiap kali dijalankan (penting untuk demo).
        model = IsolationForest(contamination='auto', random_state=42)
        
        # 3. Latih model dengan data yang kita berikan
        model.fit(features)

        # 4. Lakukan prediksi. Hasilnya adalah array: -1 untuk anomali, 1 untuk normal.
        predictions = model.predict(features)

        # 5. Kumpulkan baris log asli yang prediksinya adalah -1 (anomali)
        anomalous_indices = np.where(predictions == -1)[0]
        anomalous_logs = [log_lines[i] for i in anomalous_indices]

        # 6. Kembalikan hasilnya sebagai JSON
        return jsonify({"anomalies": anomalous_logs})

    except Exception as e:
        # Log error jika terjadi masalah
        print(f"Error saat deteksi anomali: {e}")
        return jsonify({"error": "Terjadi kesalahan internal pada ML service"}), 500

# Jalankan server Flask di port 5002
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)