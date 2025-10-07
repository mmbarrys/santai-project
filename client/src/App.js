// client/src/App.js

/*import React, { useState, useEffect } from 'react';
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

export default App;*/
// client/src/App.js

import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import TriagePage from './TriagePage';
import KnowledgeBasePage from './KnowledgeBasePage';
import './App.css';

function App() {
    // [RBAC] State sekarang menyimpan seluruh informasi pengguna (termasuk peran), bukan hanya boolean
    const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('santai_user')));
    const navigate = useNavigate();

    const handleLogin = (role) => {
        const user = { role: role };
        localStorage.setItem('santai_user', JSON.stringify(user));
        setCurrentUser(user);
        navigate('/');
    };

    const handleLogout = () => {
        localStorage.removeItem('santai_user');
        setCurrentUser(null);
        navigate('/login');
    };

    return (
        <Routes>
            <Route 
                path="/login" 
                element={
                    !currentUser ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />
                } 
            />
            
            {/* Rute Triage, bisa diakses oleh semua pengguna yang sudah login */}
            <Route 
                path="/" 
                element={
                    currentUser ? <TriagePage onLogout={handleLogout} user={currentUser} /> : <Navigate to="/login" />
                } 
            />

            {/* [RBAC] Rute Knowledge Base, HANYA bisa diakses jika peran adalah 'admin' */}
            <Route 
                path="/knowledge-base" 
                element={
                    currentUser && currentUser.role === 'admin' ? <KnowledgeBasePage /> : <Navigate to="/" />
                } 
            />
        </Routes>
    );
}

export default App;