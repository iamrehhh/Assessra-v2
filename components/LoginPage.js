'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';

const errorMessages = {
    OAuthSignin: 'Could not start Google sign-in. Check server configuration.',
    OAuthCallback: 'Google sign-in failed. Check redirect URI in Google Console.',
    OAuthCreateAccount: 'Could not create account. Check database connection.',
    Callback: 'Authentication callback error.',
    Default: 'Sign-in failed. Please try again.',
    Configuration: 'Server misconfigured — missing environment variables.',
    AccessDenied: 'Access denied.',
    CredentialsSignin: 'Invalid email or password.',
};

function LoginContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const errorType = searchParams.get('error');
    const urlError = errorType ? (errorMessages[errorType] || errorMessages.Default) : null;

    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password.');
            return;
        }

        if (isSignUp && !name.trim()) {
            setError('Please enter your full name.');
            return;
        }

        setLoading(true);

        if (isSignUp) {
            // Register first, then auto sign-in
            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setLoading(false);
                    setError(data.error || 'Registration failed.');
                    return;
                }

                // Auto sign-in after successful registration
                const result = await signIn('credentials', {
                    email: email.trim(),
                    password,
                    redirect: false,
                });

                setLoading(false);

                if (result?.error) {
                    setError('Account created but auto sign-in failed. Please sign in manually.');
                    setIsSignUp(false);
                } else if (result?.ok) {
                    router.refresh();
                }
            } catch {
                setLoading(false);
                setError('Network error. Please try again.');
            }
        } else {
            // Sign in
            const result = await signIn('credentials', {
                email: email.trim(),
                password,
                redirect: false,
            });

            setLoading(false);

            if (result?.error) {
                setError('Invalid email or password.');
            } else if (result?.ok) {
                router.refresh();
            }
        }
    };

    const displayError = error || urlError;

    return (
        <div className="login-screen">
            <div className="login-card">
                <img src="/logo.jpg" alt="Assessra" className="login-logo-img" />

                {displayError && (
                    <div className="error-msg" style={{ marginBottom: '15px' }}>
                        ⚠️ {displayError}
                    </div>
                )}

                {success && (
                    <div style={{ color: '#16a34a', fontSize: '0.9rem', fontWeight: 600, marginBottom: '15px', textAlign: 'center' }}>
                        ✅ {success}
                    </div>
                )}

                {/* Header */}
                <div className="login-header-group">
                    <h2 className="login-heading">
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </h2>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    {isSignUp && (
                        <div className="input-group">
                            <input
                                type="text"
                                className="login-input"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="name"
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <input
                            type="email"
                            className="login-input"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div className="input-group">
                        <input
                            type="password"
                            className="login-input"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                        style={{ opacity: loading ? 0.7 : 1 }}
                    >
                        {loading
                            ? (isSignUp ? 'Creating account...' : 'Signing in...')
                            : (isSignUp ? 'Create Account' : 'Sign In')
                        }
                    </button>
                </form>

                {/* Toggle Sign In / Sign Up */}
                <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
                    {isSignUp ? (
                        <>Already have an account?{' '}
                            <span
                                onClick={() => { setIsSignUp(false); setError(null); setSuccess(null); }}
                                style={{ color: 'var(--lime-primary)', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Sign In
                            </span>
                        </>
                    ) : (
                        <>Don&apos;t have an account?{' '}
                            <span
                                onClick={() => { setIsSignUp(true); setError(null); setSuccess(null); }}
                                style={{ color: 'var(--lime-primary)', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Create one
                            </span>
                        </>
                    )}
                </div>

                {/* Divider */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    margin: '20px 0',
                    gap: '12px',
                }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                </div>

                {/* Google Sign-In */}
                <button
                    className="submit-btn"
                    onClick={() => signIn('google')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                    }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" fillOpacity="0.8" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="white" fillOpacity="0.6" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" fillOpacity="0.9" />
                    </svg>
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="loading-overlay">
                <div className="spinner" />
                <div className="loading-text">Loading...</div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
