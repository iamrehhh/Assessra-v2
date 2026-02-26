'use client';

import { useState, useEffect } from 'react';
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

export default function Dashboard() {
    const { data: session } = useSession();
    const [view, setView] = useState('home');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                <div style={{ padding: '20px', background: 'white', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--lime-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px auto' }}></div>
                    <p style={{ color: '#666', fontWeight: 600 }}>Loading your profile...</p>
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
