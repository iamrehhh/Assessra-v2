'use client';

import { useState } from 'react';
import Navbar from './Navbar';
import HomeView from './views/HomeView';
import PapersView from './views/PapersView';
import ScorecardView from './views/ScorecardView';
import LeaderboardView from './views/LeaderboardView';
import FormulaeView from './views/FormulaeView';
import DefinitionsView from './views/DefinitionsView';
import TipsView from './views/TipsView';

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
            case 'scorecard':
                return <ScorecardView />;
            case 'leaderboard':
                return <LeaderboardView />;
            case 'formulae':
                return <FormulaeView />;
            case 'definitions':
                return <DefinitionsView />;
            case 'vocab':
                return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>📝 Vocabulary coming soon...</div>;
            case 'idioms':
                return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>💬 Idioms coming soon...</div>;
            case 'tips':
                return <TipsView />;
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
