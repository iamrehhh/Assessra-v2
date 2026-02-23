'use client';

import { useAuth } from '@/context/AuthContext';

export default function HomeView({ onNavigate }) {
    const { user } = useAuth();
    const firstName = user ? user.split('.')[0] : 'Student';

    return (
        <div style={{ padding: '20px 0' }}>
            {/* Welcome Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                borderRadius: '24px',
                padding: '40px 50px',
                marginBottom: '30px',
                border: '1px solid #bbf7d0',
            }}>
                <h1 style={{
                    fontFamily: 'var(--font-playfair)',
                    fontSize: '2.2rem',
                    color: 'var(--lime-dark)',
                    marginBottom: '10px',
                }}>
                    Welcome back, {firstName} 👋
                </h1>
                <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '1.1rem' }}>
                    Ready to ace your exams?
                </p>
            </div>

            {/* Quick Access Cards */}
            <h2 style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '1.5rem',
                color: '#333',
                marginBottom: '20px',
            }}>
                Quick Access
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '20px',
            }}>
                <QuickCard
                    emoji="💼"
                    title="Business P3"
                    subtitle="Decision-Making Papers"
                    onClick={() => onNavigate('papers', 'business', 'p3')}
                    color="#f0fdf4"
                    border="#bbf7d0"
                />
                <QuickCard
                    emoji="💼"
                    title="Business P4"
                    subtitle="Essay Papers"
                    onClick={() => onNavigate('papers', 'business', 'p4')}
                    color="#f0fdf4"
                    border="#bbf7d0"
                />
                <QuickCard
                    emoji="📈"
                    title="Economics P3"
                    subtitle="Multiple Choice"
                    onClick={() => onNavigate('papers', 'economics', 'p3')}
                    color="#eff6ff"
                    border="#bfdbfe"
                />
                <QuickCard
                    emoji="📈"
                    title="Economics P4"
                    subtitle="Essay Papers"
                    onClick={() => onNavigate('papers', 'economics', 'p4')}
                    color="#eff6ff"
                    border="#bfdbfe"
                />
                <QuickCard
                    emoji="🌍"
                    title="General Paper P1"
                    subtitle="Essay Questions"
                    onClick={() => onNavigate('papers', 'general', 'p1')}
                    color="#fefce8"
                    border="#fde68a"
                />
                <QuickCard
                    emoji="🌍"
                    title="General Paper P2"
                    subtitle="Data Response"
                    onClick={() => onNavigate('papers', 'general', 'p2')}
                    color="#fefce8"
                    border="#fde68a"
                />
            </div>
        </div>
    );
}

function QuickCard({ emoji, title, subtitle, onClick, color, border }) {
    return (
        <div
            onClick={onClick}
            style={{
                background: color,
                border: `1px solid ${border}`,
                borderRadius: '18px',
                padding: '25px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
            }}
        >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{emoji}</div>
            <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', color: '#1e293b', marginBottom: '5px' }}>
                {title}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>{subtitle}</p>
        </div>
    );
}
