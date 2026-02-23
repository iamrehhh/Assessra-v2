'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const errorMessages = {
    OAuthSignin: 'Could not start Google sign-in. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel.',
    OAuthCallback: 'Google sign-in callback failed. Check your redirect URI in Google Console.',
    OAuthCreateAccount: 'Could not create account in database. Check MONGODB_URI.',
    Callback: 'Authentication callback error.',
    Default: 'Sign-in failed. Please try again.',
    Configuration: 'Server configuration error — missing environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or NEXTAUTH_SECRET).',
    AccessDenied: 'Access denied.',
};

function LoginContent() {
    const searchParams = useSearchParams();
    const errorType = searchParams.get('error');
    const errorMsg = errorType ? (errorMessages[errorType] || errorMessages.Default) : null;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)',
            fontFamily: 'var(--font-jakarta)',
        }}>
            <div style={{
                background: 'white',
                padding: '60px 50px 50px',
                borderRadius: '24px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                width: '100%',
                maxWidth: '440px',
                textAlign: 'center',
            }}>
                {/* Logo */}
                <div style={{ marginBottom: '50px' }}>
                    <img
                        src="/logo.jpg"
                        alt="Assessra"
                        style={{
                            width: '120px',
                            height: 'auto',
                            display: 'block',
                            margin: '0 auto 12px',
                        }}
                    />
                    <div style={{
                        fontFamily: 'var(--font-playfair)',
                        fontSize: '1.6rem',
                        fontWeight: 700,
                        color: '#2d6a4f',
                        letterSpacing: '-0.5px',
                    }}>
                        Assessra
                    </div>
                </div>

                {/* Error Message */}
                {errorMsg && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        marginBottom: '24px',
                        color: '#dc2626',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        lineHeight: 1.5,
                    }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                {/* Google Sign-In Button */}
                <button
                    onClick={() => signIn('google')}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        border: 'none',
                        borderRadius: '14px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        transition: 'all 0.25s ease',
                        boxShadow: '0 4px 15px rgba(22,163,74,0.3)',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(22,163,74,0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = '';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(22,163,74,0.3)';
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
            <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0fdf4' }}>
                <div>Loading...</div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
