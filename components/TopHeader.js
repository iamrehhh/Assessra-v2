'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function TopHeader({ setView, userProfile, streak = 0, setIsMobileOpen }) {
    const [notification, setNotification] = useState({ active: false, message: '' });

    useEffect(() => {
        const fetchNotification = async () => {
            try {
                const res = await fetch('/api/notification');
                if (res.ok) {
                    const data = await res.json();
                    setNotification(data);
                }
            } catch (err) { console.error('Notification error', err); }
        };
        fetchNotification();
    }, []);

    const showNotification = () => {
        if (notification.message) alert(notification.message);
        else alert('No new notifications today.');
    };

    // Get initials fallback
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

                <button onClick={showNotification} className="relative text-slate-400 hover:text-white transition-colors" title="Notifications">
                    <span className="material-symbols-outlined">notifications</span>
                    {notification.active && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full border-2 border-background-dark shadow-sm shadow-primary/50"></span>
                    )}
                </button>

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

                {/* Logout button just as an icon for compactness, or hide in dropdown later. For now an icon is good. */}
                <button
                    onClick={() => signOut()}
                    className="text-slate-400 hover:text-red-400 transition-colors ml-2"
                    title="Logout"
                >
                    <span className="material-symbols-outlined">logout</span>
                </button>
            </div>
        </header>
    );
}
