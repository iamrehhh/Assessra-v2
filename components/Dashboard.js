'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import HomeView from './views/HomeView';
import PapersView from './views/PapersView';
import LeaderboardView from './views/LeaderboardView';
import FormulaeView from './views/FormulaeView';
import DefinitionsView from './views/DefinitionsView';
import ScorecardView from './views/ScorecardView';
import TipsView from './views/TipsView';
import VocabView from './views/VocabView';
import IdiomsView from './views/IdiomsView';
import OnboardingView from './views/OnboardingView';
import ProfileView from './views/ProfileView';
import AdminView from './views/AdminView';
import PracticeView from './views/PracticeView';
import PastPapersView from './views/PastPapersView';

const VALID_VIEWS = ['home', 'papers', 'practice', 'pastpapers', 'scorecard', 'leaderboard', 'formulae', 'definitions', 'vocab', 'idioms', 'tips', 'profile', 'admin'];

function getInitialView() {
    if (typeof window === 'undefined') return 'home';
    const hash = window.location.hash.replace('#', '');
    return VALID_VIEWS.includes(hash) ? hash : 'home';
}

export default function Dashboard() {
    const { data: session } = useSession();
    const [view, setViewState] = useState(getInitialView);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Wrap setView to also update the URL hash
    const setView = useCallback((newView) => {
        setViewState(newView);
        window.location.hash = newView === 'home' ? '' : newView;
    }, []);

    // Listen for browser back/forward navigation
    useEffect(() => {
        const onHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            setViewState(VALID_VIEWS.includes(hash) ? hash : 'home');
        };
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    // Fetch user profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/user');
                if (res.ok) {
                    const data = await res.json();
                    setUserProfile(data.user);
                }
            } catch (err) {
                console.error("Failed to load user profile:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (session?.user) {
            fetchProfile();
        } else {
            setIsLoading(false);
        }
    }, [session]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-background-dark flex flex-col items-center justify-center z-50">
                <div className="flex flex-col items-center gap-6 animate-fade-in">
                    <div className="relative">
                        <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-primary/30 blur-xl animate-pulse" />
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                            <img src="/logo.jpg" alt="Assessra" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <p className="text-sm font-bold text-slate-400 tracking-wide">Loading your profile...</p>
                    <div className="w-40 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
                    </div>
                </div>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', textAlign: 'center' }}>
                <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Failed to load profile</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>There was an error communicating with the server.</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{ padding: '10px 20px', background: 'var(--lime-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Retry
                </button>
            </div>
        );
    }

    // Block access if not onboarded
    if (!userProfile.isOnboarded) {
        return <OnboardingView
            userEmail={session?.user?.email}
            onComplete={(updatedProfile) => setUserProfile(updatedProfile)}
        />;
    }

    const renderContent = () => {
        switch (view) {
            case 'home':
                return <HomeView setView={setView} setSelectedSubject={setSelectedSubject} />;
            case 'papers':
                return <PapersView subject={selectedSubject} setView={setView} />;
            case 'leaderboard':
                return <LeaderboardView />;
            case 'formulae':
                return <FormulaeView />;
            case 'definitions':
                return <DefinitionsView />;
            case 'practice':
                return <PracticeView />;
            case 'pastpapers':
                return <PastPapersView />;
            case 'scorecard':
                return <ScorecardView />;
            case 'vocab':
                return <VocabView />;
            case 'idioms':
                return <IdiomsView />;
            case 'tips':
                return <TipsView />;
            case 'profile':
                return <ProfileView userProfile={userProfile} onProfileUpdate={setUserProfile} />;
            case 'admin':
                return <AdminView />;
            default:
                return <HomeView setView={setView} setSelectedSubject={setSelectedSubject} />;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-dark text-slate-100 font-display">
            <Sidebar view={view} setView={setView} userEmail={session?.user?.email} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
            <main className="flex-1 flex flex-col w-full h-full overflow-y-auto">
                <TopHeader setView={setView} userProfile={userProfile} setIsMobileOpen={setIsMobileOpen} />
                <div className="p-4 md:p-8 space-y-8 pb-20">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}
