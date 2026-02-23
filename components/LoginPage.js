'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    function handleLogin(e) {
        e.preventDefault();
        const success = login(username.trim(), password.trim());
        if (!success) {
            setError('Invalid Username or Password.');
        }
    }

    return (
        <div className="login-screen">
            <div className="login-card">
                <Image
                    src="/logo.jpg"
                    alt="Assessra Logo"
                    width={280}
                    height={200}
                    className="login-logo-img"
                    priority
                />

                <form onSubmit={handleLogin} style={{ width: '100%' }}>
                    <div className="input-group">
                        <input
                            type="text"
                            className="login-input"
                            placeholder="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="input-group">
                        <input
                            type="password"
                            className="login-input"
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <p className="error-msg">{error}</p>}

                    <button type="submit" className="submit-btn">
                        Sign in
                    </button>
                </form>
            </div>
        </div>
    );
}
