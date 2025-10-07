// client/src/LoginPage.js

import React, { useState } from 'react';
import logo from './assets/JangkarBesi_Logo.png';

function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    //const MOCK_USER = 'adminbssn';
    //const MOCK_PASS = 'JangkarBesi2025!';
    const MOCK_USERS = [
        { username: 'adminbssn', password: 'JangkarBesi2025!', role: 'admin' },
        { username: 'user', password: 'user1', role: 'user' }
    ];

    /*const handleSubmit = (event) => {
        event.preventDefault();
        if (username === MOCK_USER && password === MOCK_PASS) {
            setError('');
            onLogin();
        } else {
            setError('Username atau password salah.');
        }
    };*/
    const handleSubmit = (event) => {
        event.preventDefault();
        
        // Cari pengguna di dalam daftar
        const foundUser = MOCK_USERS.find(
            u => u.username === username && u.password === password
        );

        if (foundUser) {
            setError('');
            // [RBAC] Kirimkan informasi peran (role) saat login berhasil
            onLogin(foundUser.role);
        } else {
            setError('Username atau password salah.');
        }
    };


    return (
        <div className="login-container">
            <div className="login-box">
                <img src={logo} alt="JangkarBesi Logo" className="login-logo" />
                <h2>AI Cyber Triage</h2>
                <h3>Sistem Analisis Insiden Siber Otomatis berbasis AI (SantAI)</h3>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="error-message login-error">{error}</p>}
                    <button type="submit" className="login-button">LOGIN</button>
                </form>
                 <footer className="login-footer">
                    <p>&copy; 2025 JangkarBesi</p>
                </footer>
            </div>
        </div>
    );
}

export default LoginPage;