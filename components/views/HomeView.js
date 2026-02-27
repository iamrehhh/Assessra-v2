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

    // Art Collector State
    const [dailyArt, setDailyArt] = useState(null);
    const [artLoading, setArtLoading] = useState(true);
    const [artModalOpen, setArtModalOpen] = useState(false);

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

        const fetchDailyArt = async () => {
            try {
                const res = await fetch('/api/daily-art');
                if (res.ok) {
                    const data = await res.json();
                    setDailyArt(data);
                }
            } catch (err) {
                console.error('Failed to load daily art:', err);
            } finally {
                setArtLoading(false);
            }
        };

        if (session?.user) {
            fetchDashboardData();
            fetchQuote();
            fetchDailyArt();
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

                    {/* Vintage Art Collector Widget */}
                    <div
                        onClick={() => dailyArt && setArtModalOpen(true)}
                        className="relative group overflow-hidden rounded-[2rem] glass p-1 border border-white/10 flex-shrink-0 cursor-pointer transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-white/20"
                    >
                        <div className="relative h-[240px] md:h-[300px] overflow-hidden rounded-[1.8rem] bg-slate-900 flex items-center justify-center">
                            {artLoading ? (
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 border-3 border-white/10 border-t-primary rounded-full animate-spin"></div>
                                    <p className="text-sm font-medium text-slate-400">Curating today's art...</p>
                                </div>
                            ) : dailyArt ? (
                                <>
                                    <img
                                        className="w-full h-full object-cover opacity-80 transition-transform duration-1000 group-hover:scale-110 group-hover:opacity-100"
                                        alt={dailyArt.title}
                                        src={dailyArt.imageUrl}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/50 to-transparent"></div>

                                    <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <div className="bg-background-dark/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm text-primary">palette</span>
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-200">Daily Collector</span>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <span className="material-symbols-outlined text-white">open_in_full</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                            <div>
                                                <h3 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-lg font-serif italic selection:bg-primary/30">
                                                    {dailyArt.title}
                                                </h3>
                                                <p className="text-slate-300 font-medium text-sm md:text-base mt-1 drop-shadow-md">
                                                    {dailyArt.artist} <span className="text-slate-500 mx-2">•</span> {dailyArt.date}
                                                </p>
                                            </div>
                                            <p className="text-slate-200/90 italic text-sm md:text-base leading-relaxed border-l-2 border-primary/50 pl-4 py-1 max-w-2xl bg-gradient-to-r from-background-dark/40 to-transparent">
                                                "{dailyArt.curatorNote}"
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-slate-500 font-medium z-10">Failed to load artwork.</div>
                            )}
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

            {/* Vintage Art Modal */}
            {artModalOpen && dailyArt && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/90 backdrop-blur-xl animate-fade-in"
                    onClick={() => setArtModalOpen(false)}
                >
                    <div
                        className="relative max-w-5xl w-full bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col md:flex-row max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Image Section */}
                        <div className="w-full md:w-3/5 bg-black flex items-center justify-center p-2">
                            <img
                                src={dailyArt.imageUrl}
                                alt={dailyArt.title}
                                className="max-w-full max-h-[50vh] md:max-h-[85vh] object-contain rounded-2xl"
                            />
                        </div>

                        {/* Details Section */}
                        <div className="w-full md:w-2/5 p-8 md:p-12 flex flex-col justify-center bg-gradient-to-br from-slate-900 to-background-dark relative overflow-y-auto">
                            <button
                                onClick={() => setArtModalOpen(false)}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <div className="mb-6 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full w-fit">
                                <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                                <span className="text-primary text-[10px] font-black uppercase tracking-widest">Collector's Exhibit</span>
                            </div>

                            <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight font-serif italic mb-2">
                                {dailyArt.title}
                            </h2>
                            <p className="text-slate-400 font-medium text-lg mb-8">
                                {dailyArt.artist} <span className="mx-2 opacity-50">•</span> {dailyArt.date}
                            </p>

                            <div className="h-px w-12 bg-primary/50 mb-8"></div>

                            <div className="relative">
                                <span className="absolute -top-6 -left-4 text-6xl text-white/5 font-serif">"</span>
                                <p className="text-slate-300 text-lg lg:text-xl leading-relaxed italic relative z-10 font-medium">
                                    {dailyArt.curatorNote}
                                </p>
                            </div>

                            <div className="mt-auto pt-10">
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">New artwork curated daily</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
