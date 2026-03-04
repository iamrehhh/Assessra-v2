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
import OnboardingView from './views/OnboardingView';
import ProfileView from './views/ProfileView';
import AdminView from './views/AdminView';
import PracticeView from './views/PracticeView';
import PastPapersView from './views/PastPapersView';
import VocabIdiomsView from './views/VocabIdiomsView';
import ReportErrorModal from './ReportErrorModal';

const VALID_VIEWS = ['home', 'papers', 'practice', 'pastpapers', 'scorecard', 'leaderboard', 'formulae', 'definitions', 'vocab', 'vocab-idioms', 'tips', 'profile', 'admin'];

function parseHash() {
    if (typeof window === 'undefined') return { view: 'home', params: [] };
    const raw = window.location.hash.replace('#', '');
    if (!raw) return { view: 'home', params: [] };
    const parts = raw.split('/');
    const baseView = parts[0];
    if (!VALID_VIEWS.includes(baseView)) return { view: 'home', params: [] };
    return { view: baseView, params: parts.slice(1) };
}

function getInitialView() {
    return parseHash().view;
}

export default function Dashboard() {
    const { data: session } = useSession();
    const [view, setViewState] = useState(getInitialView);
    const [hashParams, setHashParams] = useState(() => parseHash().params);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Wrap setView to also update the URL hash
    const setView = useCallback((newView) => {
        const parts = newView.split('/');
        const baseView = parts[0];
        const params = parts.slice(1);
        setViewState(baseView);
        setHashParams(params);
        window.location.hash = newView === 'home' ? '' : newView;
    }, []);

    // Listen for browser back/forward navigation
    useEffect(() => {
        const onHashChange = () => {
            const { view: v, params: p } = parseHash();
            setViewState(v);
            setHashParams(p);
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
            const interval = setInterval(() => {
                fetchProfile();
            }, 60000);
            return () => clearInterval(interval);
        } else {
            setIsLoading(false);
        }
    }, [session]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-bg-base flex flex-col items-center justify-center z-50 overflow-hidden">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes fastShimmer {
                        0% { transform: translateX(-150%); }
                        100% { transform: translateX(150%); }
                    }
                `}} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.05)_0%,transparent_100%)] pointer-events-none" />
                <div className="flex flex-col items-center gap-8 animate-[fade-in_0.2s_ease-out] z-10 -mt-10">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
                        <div className="absolute -inset-4 border border-primary/20 rounded-[2.5rem] animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />

                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] bg-white/60 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl flex items-center justify-center p-6 sm:p-7 transform transition-transform duration-500 hover:scale-105">
                            <img
                                src="/new-logo.png"
                                alt="Assessra Logo"
                                className="w-full h-full object-contain drop-shadow-xl animate-pulse"
                                style={{ animationDuration: '1.5s' }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <p className="text-xs sm:text-sm font-black text-text-main tracking-[0.2em] uppercase opacity-90 animate-pulse" style={{ animationDuration: '1.5s' }}>
                            Loading Profile
                        </p>
                        <div className="w-48 sm:w-56 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden relative isolate">
                            <div className="absolute top-0 bottom-0 w-2/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" style={{ animation: 'fastShimmer 1.2s infinite ease-in-out' }} />
                        </div>
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
                    style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
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
                return <PastPapersView
                    initialLevel={hashParams[0] || null}
                    initialSubject={hashParams[1] || null}
                    initialScorecard={hashParams[2] === 'scorecard'}
                    setView={setView}
                />;
            case 'scorecard':
                return <ScorecardView />;
            case 'vocab':
                return <VocabView />;
            case 'vocab-idioms':
                return <VocabIdiomsView />;
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
        <div className="flex h-screen overflow-hidden bg-bg-base text-text-main font-display transition-colors duration-300">
            <Sidebar view={view} setView={setView} userEmail={session?.user?.email} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
            <main className="flex-1 flex flex-col w-full h-full overflow-y-auto">
                <TopHeader setView={setView} userProfile={userProfile} setIsMobileOpen={setIsMobileOpen} />
                <div className="flex-1 p-4 md:p-8 space-y-8 pb-10">
                    {renderContent()}
                </div>

                {/* Footer */}
                <footer className="w-full py-6 mt-auto border-t border-border-main flex flex-col items-center justify-center">
                    <p className="text-xs text-text-muted font-medium flex items-center gap-2">
                        © {new Date().getFullYear()} Abdul Rehan <span className="text-text-muted/50">|</span>
                        <a href="mailto:abdulrehanoffical@gmail.com" className="hover:text-primary transition-colors">abdulrehanoffical@gmail.com</a> <span className="text-text-muted/50">|</span>
                        <a href="https://github.com/iamrehhh/Assessra-v2" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub</a>
                    </p>
                </footer>
            </main>
            <ReportErrorModal currentView={view} />
        </div>
    );
}
