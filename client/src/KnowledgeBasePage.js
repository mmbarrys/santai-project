// client/src/KnowledgeBasePage.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function KnowledgeBasePage() {
    // State untuk menyimpan semua kasus di knowledge base
    const [cases, setCases] = useState([]);
    // State untuk form input kasus baru
    const [newCaseInput, setNewCaseInput] = useState('');
    const [newCaseOutput, setNewCaseOutput] = useState('');

    // Efek untuk memuat data dari localStorage saat komponen pertama kali dimuat
    useEffect(() => {
        const storedCases = localStorage.getItem('jangkarbesi_knowledge_base');
        if (storedCases) {
            setCases(JSON.parse(storedCases));
        }
    }, []);

    const handleAddCase = (e) => {
        e.preventDefault();
        if (!newCaseInput.trim() || !newCaseOutput.trim()) {
            alert('Input dan Output yang diharapkan tidak boleh kosong.');
            return;
        }
        
        const newCase = { 
            id: Date.now(), // ID unik sederhana
            input: newCaseInput, 
            output: newCaseOutput 
        };
        
        const updatedCases = [...cases, newCase];
        setCases(updatedCases);
        localStorage.setItem('jangkarbesi_knowledge_base', JSON.stringify(updatedCases));
        
        // Reset form
        setNewCaseInput('');
        setNewCaseOutput('');
    };

    const handleDeleteCase = (id) => {
        const updatedCases = cases.filter(c => c.id !== id);
        setCases(updatedCases);
        localStorage.setItem('jangkarbesi_knowledge_base', JSON.stringify(updatedCases));
    };

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-logo-container">
                    {/* Tautan ini sekarang adalah elemen navigasi, bukan logo utama */}
                    <nav className="header-nav">
                        <Link to="/">Kembali ke Triage</Link>
                    </nav>
                </div>
                <h2 className="page-title">Knowledge Base (Simulasi Fine-Tuning)</h2>
                 {/* Placeholder untuk menyamakan layout dengan TriagePage */}
                <div style={{width: '85px'}}></div>
            </header>

            <main className="container">
                <div className="kb-description">
                    <p>Halaman ini digunakan untuk "mengajari" AI dengan memberikan contoh-contoh kasus. Setiap contoh yang Anda tambahkan akan digunakan sebagai referensi oleh AI saat menganalisis insiden baru, membuatnya lebih cerdas dan relevan dengan konteks Anda.</p>
                </div>

                <form onSubmit={handleAddCase} className="kb-form">
                    <h3>Tambah Contoh Kasus Baru</h3>
                    <div className="input-group">
                        <label>Deskripsi Singkat Anomali (Input)</label>
                        <input 
                            type="text" 
                            value={newCaseInput}
                            onChange={(e) => setNewCaseInput(e.target.value)}
                            placeholder="Contoh: Terdeteksi brute force RDP dari banyak IP"
                        />
                    </div>
                    <div className="input-group">
                        <label>Narasi & Rekomendasi Ideal (Output yang Diharapkan)</label>
                        <textarea
                            rows="5"
                            value={newCaseOutput}
                            onChange={(e) => setNewCaseOutput(e.target.value)}
                            placeholder="Contoh: Narasi: Terjadi serangan brute force terdistribusi pada port RDP (3389). Rekomendasi: 1. Terapkan Network Level Authentication (NLA). 2. Batasi akses RDP hanya dari IP terpercaya. 3. Periksa log Windows Security Event ID 4625."
                        ></textarea>
                    </div>
                    <button type="submit">Tambah ke Knowledge Base</button>
                </form>

                <div className="kb-list">
                    <h3>Daftar Kasus di Knowledge Base</h3>
                    {cases.length === 0 ? (
                        <p className="empty-kb-message">Knowledge Base kosong. Tambahkan kasus baru untuk mulai mengajari AI.</p>
                    ) : (
                        cases.map(c => (
                            <div key={c.id} className="kb-case">
                                <div className="case-content">
                                    <p><strong>Input:</strong> {c.input}</p>
                                    <p><strong>Output:</strong> {`"${c.output}"`}</p>
                                </div>
                                <button onClick={() => handleDeleteCase(c.id)} className="delete-button">Hapus</button>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}

export default KnowledgeBasePage;