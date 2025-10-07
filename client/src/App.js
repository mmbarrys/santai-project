// client/src/App.js

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import TriagePage from './TriagePage';
import KnowledgeBasePage from './KnowledgeBasePage'; 
import './App.css';

function App() {
    // State sekarang diinisialisasi dengan memeriksa localStorage
    // Apakah ada token 'auth' yang bernilai 'true' di localStorage?
    const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('isAuthenticated') === 'true');
    const navigate = useNavigate();

    // Fungsi login sekarang juga menulis ke localStorage
    const handleLogin = () => {
        localStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
        // Navigasi ke halaman triage setelah login
        navigate('/');
    };

    // Fungsi logout untuk membersihkan sesi
    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
        // Navigasi kembali ke halaman login setelah logout
        navigate('/login');
    };

    return (
        <Routes>
            <Route 
                path="/login" 
                element={
                    // Jika sudah login, jangan biarkan kembali ke halaman login, arahkan ke triage
                    !isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />
                } 
            />
            <Route 
                path="/" 
                element={
                    // Jika belum login, paksa ke halaman login
                    isAuthenticated ? <TriagePage onLogout={handleLogout} /> : <Navigate to="/login" />
                } 
            />
            <Route 
                path="/knowledge-base" 
                element={isAuthenticated ? <KnowledgeBasePage /> : <Navigate to="/login" />} 
            />
        </Routes>
        
    );
}

export default App;