'use client';

import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { useState } from 'react';
import SubjectsPanel from './SubjectsPanel';

export default function Navbar({ currentView, onNavigate }) {
    const { logout } = useAuth();
    const [subjectsOpen, setSubjectsOpen] = useState(false);

    return (
        <>
            <header className="app-header">
                <div className="header-left">
                    <Image
                        src="/logo.jpg"
                        alt="Assessra"
                        width={70}
                        height={70}
                        className="app-logo"
                        onClick={() => onNavigate('home')}
                    />
                </div>

                <nav className="nav">
                    {/* Subjects Panel Trigger */}
                    <button
                        className={`nav-btn ${currentView === 'papers' ? 'active' : ''}`}
                        onClick={() => setSubjectsOpen(true)}
                    >
                        Subjects
                    </button>

                    {/* Formulae Dropdown */}
                    <div className="nav-item-wrapper">
                        <button
                            className={`nav-btn ${currentView === 'formulae' ? 'active' : ''}`}
                            onClick={() => onNavigate('formulae')}
                        >
                            Formulae ▾
                        </button>
                        <div className="dropdown-menu">
                            <div className="dropdown-item" onClick={() => onNavigate('formulae', 'business')}>Business</div>
                            <div className="dropdown-item" onClick={() => onNavigate('formulae', 'economics')}>Economics</div>
                        </div>
                    </div>

                    {/* Definitions Dropdown */}
                    <div className="nav-item-wrapper">
                        <button
                            className={`nav-btn ${currentView === 'definitions' ? 'active' : ''}`}
                            onClick={() => onNavigate('definitions')}
                        >
                            Definitions ▾
                        </button>
                        <div className="dropdown-menu">
                            <div className="dropdown-item" onClick={() => onNavigate('definitions', 'business')}>Business</div>
                            <div className="dropdown-item" onClick={() => onNavigate('definitions', 'economics')}>Economics</div>
                        </div>
                    </div>

                    {/* Scorecard */}
                    <button
                        className={`nav-btn ${currentView === 'scorecard' ? 'active' : ''}`}
                        onClick={() => onNavigate('scorecard')}
                    >
                        Scorecard
                    </button>

                    {/* Others Dropdown */}
                    <div className="nav-item-wrapper">
                        <button className="nav-btn">Others ▾</button>
                        <div className="dropdown-menu">
                            <div className="dropdown-item" onClick={() => onNavigate('vocab')}>Vocab</div>
                            <div className="dropdown-item" onClick={() => onNavigate('idioms')}>Idioms</div>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <button
                        className={`nav-btn ${currentView === 'leaderboard' ? 'active' : ''}`}
                        onClick={() => onNavigate('leaderboard')}
                    >
                        🏆 Leaderboard
                    </button>

                    {/* Tips */}
                    <button
                        className="nav-btn"
                        style={{ fontSize: '1.5rem', padding: '5px 12px' }}
                        onClick={() => onNavigate('tips')}
                    >
                        💡
                    </button>

                    {/* Logout */}
                    <button className="nav-btn" onClick={logout}>
                        Logout
                    </button>
                </nav>
            </header>

            {/* Subjects Side Panel */}
            <SubjectsPanel
                isOpen={subjectsOpen}
                onClose={() => setSubjectsOpen(false)}
                onSelect={(subject, paper) => {
                    setSubjectsOpen(false);
                    onNavigate('papers', subject, paper);
                }}
            />
        </>
    );
}
