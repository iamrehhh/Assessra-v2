'use client';

import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';

export default function TopHeader({ setView, userProfile, setIsMobileOpen }) {
    const { data: session } = useSession();
    const [streak, setStreak] = useState(0);
    const [notification, setNotification] = useState({ active: false, message: '' });
    const [showPanel, setShowPanel] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        const fetchNotification = async () => {
            try {
                const res = await fetch('/api/notification');
                if (res.ok) {
                    const data = await res.json();
                    setNotification(data);
                    // Check if user already saw this exact message
                    const seenMsg = localStorage.getItem('assessra_seen_notification');
                    setHasUnread(data.active && data.message && data.message !== seenMsg);
                }
            } catch (err) { console.error('Notification error', err); }
        };

        const fetchStreak = async () => {
            if (!session?.user?.email) return;
            try {
                const res = await fetch(`/api/scores/user?username=${encodeURIComponent(session.user.email)}`);
                if (!res.ok) return;
                const data = await res.json();

                if (data.attempts || data.scores) {
                    const records = data.attempts || data.scores;

                    // Group scores by local date string
                    const scoresByDate = {};
                    records.forEach(r => {
                        const dateStr = new Date(r.submittedAt || r.submitted_at).toLocaleDateString();
                        scoresByDate[dateStr] = (scoresByDate[dateStr] || 0) + r.score;
                    });

                    let calculatedStreak = 0;
                    let checkDate = new Date();
                    const todayStr = checkDate.toLocaleDateString();

                    // If today's score >= 50, streak starts here
                    const todayScore = scoresByDate[todayStr] || 0;
                    if (todayScore >= 50) {
                        calculatedStreak++;
                    }

                    // Look backward day by day starting from yesterday
                    checkDate.setDate(checkDate.getDate() - 1);
                    while (true) {
                        const prevDateStr = checkDate.toLocaleDateString();
                        const dailyScore = scoresByDate[prevDateStr] || 0;
                        if (dailyScore >= 50) {
                            calculatedStreak++;
                            checkDate.setDate(checkDate.getDate() - 1); // Move to the day before
                        } else {
                            break; // Streak broken
                        }
                    }

                    setStreak(calculatedStreak);
                }
            } catch (err) {
                console.error("Failed to fetch streak data:", err);
            }
        };

        fetchNotification();
        if (session) fetchStreak();
    }, [session]);

    const handleOpenPanel = () => {
        setShowPanel(!showPanel);
        if (!showPanel && notification.active && notification.message) {
            // Mark as read
            setHasUnread(false);
            localStorage.setItem('assessra_seen_notification', notification.message);
        }
    };

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setShowPanel(false);
            }
        };
        if (showPanel) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPanel]);

    const getInitials = (nameStr) => {
        if (!nameStr) return '?';
        return nameStr.charAt(0).toUpperCase();
    };

    return (
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 bg-background-dark/80 backdrop-blur-md z-10 shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileOpen(true)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-2xl">menu</span>
                </button>
                <div className="hidden md:flex items-center bg-white/5 rounded-xl px-4 py-2 w-96 border border-white/10">
                    <span className="material-symbols-outlined text-slate-400 text-xl mr-2">search</span>
                    <input
                        className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-500 text-slate-200 outline-none"
                        placeholder="Search for papers, formulas, or concepts..."
                        type="text"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-full border-primary/20">
                    <span className="material-symbols-outlined text-primary fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    <span className="text-sm font-bold text-slate-200">{streak} Day Streak</span>
                </div>

                {/* Notification Bell + Dropdown */}
                <div className="relative" ref={panelRef}>
                    <button onClick={handleOpenPanel} className="relative text-slate-400 hover:text-white transition-colors" title="Notifications">
                        <span className="material-symbols-outlined">notifications</span>
                        {hasUnread && (
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background-dark shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                        )}
                    </button>

                    {/* Dropdown Panel */}
                    {showPanel && (
                        <div
                            className="absolute right-0 mt-3 w-80 rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40"
                            style={{
                                background: 'rgba(23, 23, 23, 0.85)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                animation: 'fadeSlideDown 0.25s ease-out forwards',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">notifications_active</span>
                                    <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase">Notifications</h3>
                                </div>
                                <button onClick={() => setShowPanel(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5">
                                {notification.active && notification.message ? (
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="material-symbols-outlined text-primary text-lg">campaign</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-200 leading-relaxed">{notification.message}</p>
                                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                                                From Admin Team
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                            <span className="material-symbols-outlined text-slate-500 text-2xl">notifications_off</span>
                                        </div>
                                        <p className="text-sm text-slate-400 font-medium">No new notifications</p>
                                        <p className="text-xs text-slate-600 mt-1">You&#39;re all caught up!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer group" onClick={() => setView('profile')}>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{userProfile?.level || 'Student'}</p>
                        <p className="text-sm font-bold text-slate-200">{userProfile?.nickname || userProfile?.name || 'User'}</p>
                    </div>
                    {userProfile?.image ? (
                        <img
                            className="w-10 h-10 rounded-full border border-white/10 object-cover ring-2 ring-transparent group-hover:ring-primary/50 transition-all"
                            src={userProfile.image}
                            alt="Profile"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-primary text-background-dark font-bold text-lg ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                            {getInitials(userProfile?.nickname || userProfile?.name)}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => signOut()}
                    className="text-slate-400 hover:text-red-400 transition-colors ml-2"
                    title="Logout"
                >
                    <span className="material-symbols-outlined">logout</span>
                </button>
            </div>

            {/* Animation keyframes */}
            <style jsx>{`
                @keyframes fadeSlideDown {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </header>
    );
}
