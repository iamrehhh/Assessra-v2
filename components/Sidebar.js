'use client';

const ADMIN_EMAILS = ['abdulrehanoffical@gmail.com', 'willdexter98@gmail.com'];

import { useState, useEffect } from 'react';

export default function Sidebar({ view, setView, userEmail, isMobileOpen, setIsMobileOpen }) {
    const isAdmin = ADMIN_EMAILS.includes(userEmail);

    const [completedPapers, setCompletedPapers] = useState(0);
    const paperGoal = 10;
    const goalPercent = Math.min(100, Math.round((completedPapers / paperGoal) * 100)) || 0;

    useEffect(() => {
        const fetchScores = async () => {
            try {
                if (!userEmail) return;
                const scoresRes = await fetch('/api/scores/user');
                const scoresData = await scoresRes.json();

                if (scoresData.scores && scoresData.scores.length > 0) {
                    setCompletedPapers(scoresData.scores.length);
                }
            } catch (err) {
                console.error('Failed to fetch user scores for sidebar:', err);
            }
        };
        fetchScores();
    }, [userEmail]);

    const navItems = [
        { id: 'home', icon: 'grid_view', label: 'Overview' },
        { id: 'papers', icon: 'book', label: 'Subjects' },
        { id: 'scorecard', icon: 'bar_chart', label: 'Scorecard' },
        { id: 'leaderboard', icon: 'leaderboard', label: 'Leaderboard' },
    ];

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/5 flex flex-col bg-background-dark shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src="/logo.jpg" alt="Assessra Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-xl font-black tracking-tighter uppercase italic text-slate-100 m-0 leading-none">Assessra</h1>
                </div>
                <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                {navItems.map(item => {
                    const isActive = view === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                                }`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </button>
                    );
                })}

                {isAdmin && (
                    <button
                        onClick={() => setView('admin')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-4 ${view === 'admin'
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "text-red-400/80 hover:bg-white/5 hover:text-red-400 border border-transparent"
                            }`}
                    >
                        <span className="material-symbols-outlined">admin_panel_settings</span>
                        <span className="font-medium uppercase tracking-wide text-sm font-bold">Admin</span>
                    </button>
                )}
            </nav>

            <div className="p-4 border-t border-white/5 mt-auto">
                <div className="glass-primary rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-300 mb-1">Papers Completed</p>
                    <p className="text-xs text-slate-400 mb-2">{completedPapers}/{paperGoal} Papers Done</p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${goalPercent}%` }}></div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
