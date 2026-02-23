'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const errorMessages = {
    OAuthSignin: 'Could not start Google sign-in. Check server configuration.',
    OAuthCallback: 'Google sign-in failed. Check redirect URI in Google Console.',
    OAuthCreateAccount: 'Could not create account. Check database connection.',
    Callback: 'Authentication callback error.',
    Default: 'Sign-in failed. Please try again.',
    Configuration: 'Server misconfigured — missing environment variables.',
    AccessDenied: 'Access denied.',
};

function LoginContent() {
    const searchParams = useSearchParams();
    const errorType = searchParams.get('error');
    const errorMsg = errorType ? (errorMessages[errorType] || errorMessages.Default) : null;

    return (
        <div className="login-screen">
            <div className="login-card">
                <img src="/logo.jpg" alt="Assessra" className="login-logo-img" />

                {errorMsg && (
                    <div className="error-msg" style={{ marginBottom: '15px' }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                <button className="submit-btn" onClick={() => signIn('google')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
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
