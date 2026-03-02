'use client';

import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import ThemeToggle from './ThemeToggle';

export default function TopHeader({ setView, userProfile, setIsMobileOpen }) {
    const { data: session } = useSession();
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
                    const seenMsg = localStorage.getItem('assessra_seen_notification');
                    setHasUnread(data.active && data.message && data.message !== seenMsg);
                }
            } catch (err) { console.error('Notification error', err); }
        };

        fetchNotification();
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
        <header className="h-20 border-b border-border-main flex items-center justify-between px-8 sticky top-0 bg-bg-base/80 backdrop-blur-md z-10 shrink-0 transition-colors duration-300">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileOpen(true)} className="lg:hidden text-text-muted hover:text-text-main transition-colors">
                    <span className="material-symbols-outlined text-2xl">menu</span>
                </button>
                <div className="hidden md:flex items-center bg-black/5 dark:bg-white/5 rounded-xl px-4 py-2 w-96 border border-border-main">
                    <span className="material-symbols-outlined text-text-muted text-xl mr-2">search</span>
                    <input
                        className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-text-muted text-text-main outline-none"
                        placeholder="Search for papers, formulas, or concepts..."
                        type="text"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">

                <ThemeToggle />

                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-report-modal'))}
                    className="relative flex items-center gap-2 px-3 py-1.5 glass rounded-full border border-red-500/20 hover:border-red-500/40 transition-all group"
                >
                    <span className="material-symbols-outlined text-red-400 group-hover:text-red-500 text-lg">bug_report</span>
                    <span className="text-sm font-bold text-text-muted group-hover:text-text-main transition-colors hidden sm:inline">Report Error</span>
                </button>

                {/* Notification Bell + Dropdown */}
                <div className="relative" ref={panelRef}>
                    <button onClick={handleOpenPanel} className="relative text-text-muted hover:text-text-main transition-colors" title="Notifications">
                        <span className="material-symbols-outlined">notifications</span>
                        {hasUnread && (
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-bg-base shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                        )}
                    </button>

                    {/* Dropdown Panel */}
                    {showPanel && (
                        <div
                            className="absolute right-0 mt-3 w-80 rounded-2xl border border-border-main overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/40 bg-bg-card/90"
                            style={{
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                animation: 'fadeSlideDown 0.25s ease-out forwards',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-border-main">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">notifications_active</span>
                                    <h3 className="text-sm font-bold text-text-main tracking-wide uppercase">Notifications</h3>
                                </div>
                                <button onClick={() => setShowPanel(false)} className="text-text-muted hover:text-text-main transition-colors">
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
                                            <p className="text-sm text-text-main leading-relaxed">{notification.message}</p>
                                            <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                                                From Admin Team
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                                            <span className="material-symbols-outlined text-text-muted text-2xl">notifications_off</span>
                                        </div>
                                        <p className="text-sm text-text-muted font-medium">No new notifications</p>
                                        <p className="text-xs text-text-muted/70 mt-1">You&#39;re all caught up!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pl-4 border-l border-border-main cursor-pointer group" onClick={() => setView('profile')}>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-text-muted group-hover:text-text-main/80 transition-colors">{userProfile?.level || 'Student'}</p>
                        <p className="text-sm font-bold text-text-main">{userProfile?.nickname || userProfile?.name || 'User'}</p>
                    </div>
                    {userProfile?.image ? (
                        <img
                            className="w-10 h-10 rounded-full border border-border-main object-cover ring-2 ring-transparent group-hover:ring-primary/50 transition-all"
                            src={userProfile.image}
                            alt="Profile"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center bg-primary text-bg-base font-bold text-lg ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                            {getInitials(userProfile?.nickname || userProfile?.name)}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => signOut()}
                    className="text-text-muted hover:text-red-500 transition-colors ml-2"
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
