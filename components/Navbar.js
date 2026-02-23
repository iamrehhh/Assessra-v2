'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

const navItems = [
    { id: 'papers', label: 'Past Papers', icon: '📄' },
    { id: 'scorecard', label: 'Scorecard', icon: '📊' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'formulae', label: 'Formulae', icon: '📐' },
    { id: 'definitions', label: 'Definitions', icon: '📚' },
    { id: 'vocab', label: 'Vocabulary', icon: '📝' },
    { id: 'idioms', label: 'Idioms', icon: '💬' },
    { id: 'tips', label: 'Tips & Hacks', icon: '💡' },
];

export default function Navbar({ currentView, onNavigate }) {
    const { data: session } = useSession();

    return (
        <nav className="sidebar">
            <div className="sidebar-header" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
                <Image src="/logo.png" alt="Assessra Logo" width={140} height={40} className="logo" />
                <div className="version-badge">v2.0</div>
            </div>

            <div className="nav-menu">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-btn ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="user-profile">
                <div className="avatar">
                    {session?.user?.image ? (
                        <Image src={session.user.image} alt={session.user.name} width={36} height={36} style={{ borderRadius: '50%' }} />
                    ) : (
                        '👤'
                    )}
                </div>
                <div className="user-info">
                    <div className="user-name">{session?.user?.name || 'Student'}</div>
                    <button className="logout-btn" onClick={() => signOut()}>Logout</button>
                </div>
            </div>
        </nav>
    );
}
