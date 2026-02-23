'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from './Navbar';
import HomeView from './views/HomeView';
import PapersView from './views/PapersView';
import LeaderboardView from './views/LeaderboardView';
import FormulaeView from './views/FormulaeView';
import DefinitionsView from './views/DefinitionsView';
import TipsView from './views/TipsView';
import VocabView from './views/VocabView';
import IdiomsView from './views/IdiomsView';
import OnboardingView from './views/OnboardingView';
import ProfileView from './views/ProfileView';

export default function Dashboard() {
    const { data: session } = useSession();
    const [view, setView] = useState('home');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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

    // Block access if not onboarded
    if (userProfile && !userProfile.isOnboarded) {
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
            case 'vocab':
                return <VocabView />;
            case 'idioms':
                return <IdiomsView />;
            case 'tips':
                return <TipsView />;
            case 'profile':
                return <ProfileView userProfile={userProfile} onProfileUpdate={setUserProfile} />;
            default:
                return <HomeView setView={setView} setSelectedSubject={setSelectedSubject} />;
        }
    };

    return (
        <div id="app-layer">
            <Navbar setView={setView} userProfile={userProfile} />
            <div style={{ padding: '20px' }}>
                {renderContent()}
            </div>
        </div>
    );
}
