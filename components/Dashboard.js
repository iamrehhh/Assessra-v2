'use client';

import { useState } from 'react';
import Navbar from './Navbar';
import HomeView from './views/HomeView';
import PapersView from './views/PapersView';

export default function Dashboard() {
    const [view, setView] = useState('home');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedPaper, setSelectedPaper] = useState(null);

    function handleNavigate(viewName, subject = null, paper = null) {
        setView(viewName);
        if (subject) setSelectedSubject(subject);
        if (paper) setSelectedPaper(paper);
    }

    function renderView() {
        switch (view) {
            case 'home':
                return <HomeView onNavigate={handleNavigate} />;
            case 'papers':
                return (
                    <PapersView
                        subject={selectedSubject}
                        paper={selectedPaper}
                        onBack={() => setView('home')}
                    />
                );
            case 'formulae':
                return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>📐 Formulae coming soon...</div>;
            case 'definitions':
                return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>📚 Definitions coming soon...</div>;
            case 'scorecard':
                return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>📊 Scorecard coming soon...</div>;
            case 'leaderboard':
                return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>🏆 Leaderboard coming soon...</div>;
            case 'vocab':
                return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>📝 Vocabulary coming soon...</div>;
            case 'idioms':
                return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>💬 Idioms coming soon...</div>;
            case 'tips':
                return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>💡 Tips coming soon...</div>;
            default:
                return <HomeView onNavigate={handleNavigate} />;
        }
    }

    return (
        <div className="container">
            <Navbar currentView={view} onNavigate={handleNavigate} />
            <main>{renderView()}</main>
        </div>
    );
}
