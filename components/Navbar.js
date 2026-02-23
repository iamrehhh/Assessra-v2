'use client';

import { signOut, useSession } from 'next-auth/react';

export default function Navbar({ currentView, onNavigate }) {
    const { data: session } = useSession();

    return (
        <div className="app-header">
            <div className="header-left">
                <img
                    src="/logo.jpg"
                    alt="Assessra"
                    className="app-logo"
                    onClick={() => onNavigate('home')}
                />
            </div>

            <div className="nav">
                <button
                    className={`nav-btn ${currentView === 'papers' ? 'active' : ''}`}
                    onClick={() => onNavigate('papers')}
                >
                    Subjects
                </button>

                <button
                    className={`nav-btn ${currentView === 'formulae' ? 'active' : ''}`}
                    onClick={() => onNavigate('formulae')}
                >
                    Formulae
                </button>

                <button
                    className={`nav-btn ${currentView === 'definitions' ? 'active' : ''}`}
                    onClick={() => onNavigate('definitions')}
                >
                    Definitions
                </button>

                <button
                    className={`nav-btn ${currentView === 'scorecard' ? 'active' : ''}`}
                    onClick={() => onNavigate('scorecard')}
                >
                    Scorecard
                </button>

                <button
                    className={`nav-btn ${currentView === 'leaderboard' ? 'active' : ''}`}
                    onClick={() => onNavigate('leaderboard')}
                >
                    🏆 Leaderboard
                </button>

                <button
                    className={`nav-btn ${currentView === 'tips' ? 'active' : ''}`}
                    onClick={() => onNavigate('tips')}
                    style={{ fontSize: '1.5rem', padding: '5px 15px' }}
                >
                    💡
                </button>

                <button className="nav-btn" onClick={() => signOut()}>
                    Logout
                </button>
            </div>
        </div>
    );
}
