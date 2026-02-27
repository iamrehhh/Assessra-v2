'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function HomeView({ setView, setSelectedSubject }) {
    const { data: session } = useSession();
    const [quote, setQuote] = useState("Keep up the momentum! You're making great progress.");
    const [stats, setStats] = useState({
        rank: '-',
        avgScore: 0,
        totalScore: 0,
        todayScore: 0,
        leaderboardTop3: [],
        completedModules: 0,
        streak: 0,
    });

    const user = session?.user?.name || 'Student';
    const firstName = user.split(' ')[0] || 'Student';

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const userEmail = session?.user?.email;
                if (!userEmail) return;

                // Fetch user scores
                const scoresRes = await fetch(`/api/scores/user?username=${encodeURIComponent(userEmail)}`);
                const scoresData = await scoresRes.json();

                // Fetch leaderboard for rank
                const lbRes = await fetch('/api/leaderboard');
                const lbData = await lbRes.json();

                let totalS = 0;
                let todayS = 0;
                let totalMax = 0;
                let completed = 0;

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (scoresData.attempts && scoresData.attempts.length > 0) {
                    completed = scoresData.attempts.length;
                    scoresData.attempts.forEach(s => {
                        totalS += s.score;
                        totalMax += s.maxMarks;

                        const attemptDate = new Date(s.submittedAt);
                        attemptDate.setHours(0, 0, 0, 0);
                        if (attemptDate.getTime() === today.getTime()) {
                            todayS += s.score;
                        }
                    });
                } else if (scoresData.scores && scoresData.scores.length > 0) {
                    // Fallback in case of old API return format
                    completed = scoresData.scores.length;
                    scoresData.scores.forEach(s => {
                        totalS += s.score;
                        totalMax += s.maxMarks;

                        const attemptDate = new Date(s.submittedAt || s.submitted_at);
                        attemptDate.setHours(0, 0, 0, 0);
                        if (attemptDate.getTime() === today.getTime()) {
                            todayS += s.score;
                        }
                    });
                }

                const avg = totalMax > 0 ? Math.round((totalS / totalMax) * 100 * 10) / 10 : 0;

                // Find rank in leaderboard
                let currentRank = '-';
                if (lbData.leaderboard && userEmail) {
                    const idx = lbData.leaderboard.findIndex(u => u.username === userEmail);
                    if (idx !== -1) currentRank = idx + 1;
                }

                // Calculate streak
                let calculatedStreak = 0;
                const allRecords = scoresData.attempts || scoresData.scores || [];
                if (allRecords.length > 0) {
                    const scoresByDate = {};
                    allRecords.forEach(r => {
                        const dateStr = new Date(r.submittedAt || r.submitted_at).toLocaleDateString();
                        scoresByDate[dateStr] = (scoresByDate[dateStr] || 0) + r.score;
                    });
                    let checkDate = new Date();
                    const todayStr = checkDate.toLocaleDateString();
                    if ((scoresByDate[todayStr] || 0) >= 50) calculatedStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                    while (true) {
                        const prevStr = checkDate.toLocaleDateString();
                        if ((scoresByDate[prevStr] || 0) >= 50) {
                            calculatedStreak++;
                            checkDate.setDate(checkDate.getDate() - 1);
                        } else break;
                    }
                }

                setStats({
                    rank: currentRank,
                    avgScore: avg,
                    totalScore: totalS,
                    todayScore: todayS,
                    leaderboardTop3: lbData.leaderboard ? lbData.leaderboard.slice(0, 3) : [],
                    completedModules: completed,
                    streak: calculatedStreak,
                });

            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            }
        };

        const fetchQuote = async () => {
            try {
                const res = await fetch('/api/quote');
                if (res.ok) {
                    const data = await res.json();
                    if (data.quote) setQuote(data.quote);
                }
            } catch (err) {
                console.error('Failed to load quote:', err);
            }
        };

        if (session?.user) {
            fetchDashboardData();
            fetchQuote();
        }
    }, [session]);

    const navigateToPaper = (subject) => {
        setSelectedSubject(subject);
        setView('papers');
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2 text-slate-100">
                        Welcome back, <span className="text-primary italic">{firstName}</span>
                    </h2>
                    <div className="mt-2">
                        <p className="text-slate-300 italic text-lg opacity-90 leading-snug">
                            "{quote.split(' — ')[0]}"
                        </p>
                        {quote.includes(' — ') && (
                            <p className="text-primary/80 font-medium text-sm mt-1 uppercase tracking-widest">
                                — {quote.split(' — ')[1]}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 shrink-0">
                    <div className="glass p-4 rounded-2xl min-w-[180px] border border-white/5 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                            <span className="material-symbols-outlined text-primary text-2xl fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium mb-0.5 uppercase tracking-wider">Daily Streak</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-primary">{stats.streak}</span>
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Days</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-12 gap-6">
                {/* Main Left Column */}
                <div className="col-span-12 lg:col-span-8 space-y-6 flex flex-col">

                    {/* Featured Course Card */}
                    <div className="relative group overflow-hidden rounded-[2rem] glass p-1 border border-white/10 flex-shrink-0">
                        <div className="relative h-[240px] md:h-[300px] overflow-hidden rounded-[1.8rem]">
                            <img
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                alt="Modern university library"
                                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent"></div>

                            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <span className="bg-primary/20 backdrop-blur-md text-primary text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-primary/30">Business</span>
                                        <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-white/20">Paper 4</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Business Strategy & Innovation</h3>
                                        <p className="text-slate-300">Master the 20-mark essay structure</p>
                                    </div>
                                    <div className="flex items-center gap-4 pt-2">
                                        <button
                                            onClick={() => navigateToPaper('business')}
                                            className="bg-primary hover:bg-primary/90 text-background-dark px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <span className="material-symbols-outlined">play_arrow</span>
                                            Resume Practice
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">

                        {/* Daily Progress Widget */}
                        <div className="glass p-6 rounded-3xl space-y-4 flex flex-col justify-center border border-white/5">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-slate-100">Daily Progress</h4>
                                <span className="text-xs font-bold text-primary">{Math.min(100, Math.round((stats.todayScore / 50) * 100))}% of Goal</span>
                            </div>
                            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="bg-primary h-full shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (stats.todayScore / 50) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 font-medium">
                                <span>{stats.todayScore} Points Done</span>
                                <span>Goal: 50</span>
                            </div>
                        </div>

                        {/* Total Expertise Widget */}
                        <div className="glass p-6 rounded-3xl flex items-center justify-between gap-5 border border-white/5 h-full">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                    <span className="material-symbols-outlined text-primary text-3xl fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Expertise</p>
                                    <p className="text-2xl font-black text-slate-100">{stats.totalScore} <span className="text-sm font-medium text-slate-400">XP</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="col-span-12 lg:col-span-4 space-y-6">

                    {/* Cumulative Score */}
                    <div className="glass p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-start mb-6">
                            <h4 className="font-bold text-lg text-slate-100">Cumulative Score</h4>
                            <span className="material-symbols-outlined text-slate-500">more_horiz</span>
                        </div>

                        <div className="flex justify-center py-4">
                            <div className="relative flex items-center justify-center">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle className="text-white/5" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                                    <circle
                                        className="text-primary transition-all duration-1000 ease-out"
                                        cx="64" cy="64" fill="transparent" r="58" stroke="currentColor"
                                        strokeDasharray="364.4"
                                        strokeDashoffset={364.4 - (364.4 * Math.min(100, (stats.totalScore / 5000) * 100)) / 100}
                                        strokeWidth="8"
                                    ></circle>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-slate-100">{stats.totalScore}</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Points</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mt-6">
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-sm text-primary fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>trip_origin</span>
                                    <span className="text-sm font-medium text-slate-300">Level Target</span>
                                </div>
                                <span className="text-sm font-bold text-slate-100">5000 XP</span>
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard Preview */}
                    <div className="glass p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-bold text-slate-100">Top Performers</h4>
                            <button onClick={() => setView('leaderboard')} className="text-primary text-xs font-bold hover:underline">View All</button>
                        </div>

                        <div className="space-y-4">
                            {stats.leaderboardTop3.length > 0 ? stats.leaderboardTop3.map((lbUser, index) => (
                                <div key={lbUser.username} className={`flex items-center justify-between p-2 rounded-xl ${lbUser.username === session?.user?.email ? 'bg-primary/10 border border-primary/20 -mx-2 px-4' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold w-4 text-center ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                                            {index + 1}
                                        </span>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 text-xs font-bold ring-1 ring-white/10 shrink-0">
                                            {lbUser.nickname ? lbUser.nickname.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <span className="text-sm font-bold text-slate-200 truncate max-w-[100px]" title={lbUser.nickname}>
                                            {lbUser.nickname || 'Student'} {lbUser.username === session?.user?.email && '(You)'}
                                        </span>
                                    </div>
                                    <span className="text-xs font-black text-primary shrink-0">{lbUser.totalScore} XP</span>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500 text-center py-4">No scores yet.</p>
                            )}
                        </div>
                    </div>



                </div>
            </div>

            {/* Subjects Quick Links Removed per user request */}
        </div>
    );
}

function SubjectCard({ icon, title, desc, onClick }) {
    return (
        <div
            onClick={onClick}
            className="glass p-5 rounded-3xl hover:border-primary/50 transition-all cursor-pointer group text-center border border-white/5 flex flex-col items-center justify-center min-h-[120px]"
        >
            <span className="material-symbols-outlined text-3xl mb-3 text-primary group-hover:scale-110 group-hover:-translate-y-1 transition-transform block">
                {icon}
            </span>
            <p className="font-bold text-sm text-slate-200">{title}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-wider">{desc}</p>
        </div>
    );
}
