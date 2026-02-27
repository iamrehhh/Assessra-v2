'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PastPapersView() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ levels: [], subjectsByLevel: {}, documents: [] });
    const [error, setError] = useState('');

    // Selection State
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/past-papers/available');
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Failed to fetch available past papers.');
                setData(json);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Helper to format strings like 'alevel' to 'A Level'
    const formatLabel = (str) => {
        if (!str) return '';
        if (str === 'alevel') return 'A Level';
        if (str === 'igcse') return 'IGCSE';
        return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <div className="w-8 h-8 border-4 border-white/10 border-t-primary rounded-full animate-spin mb-4" />
                <p className="font-bold">Loading available past papers...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center max-w-md">
                    <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
                    <h3 className="text-lg font-bold text-slate-100 mb-2">Could not load papers</h3>
                    <p className="text-sm text-slate-400 font-medium">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 py-2 px-6 rounded-xl font-bold transition-all">Retry</button>
                </div>
            </div>
        );
    }

    // Step 1: Select Level
    if (!selectedLevel) {
        // Sort levels to ensure IGCSE is first if there are both
        const sortedLevels = [...data.levels].sort((a, b) => a === 'igcse' ? -1 : 1);

        return (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                <div className="text-center space-y-2 mb-10">
                    <h2 className="text-3xl font-black tracking-tight text-slate-100">
                        <span className="text-primary">📚</span> Past Paper Practice
                    </h2>
                    <p className="text-slate-400">Select your education level to view available past papers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['igcse', 'alevel'].map(cat => {
                        const isAvailable = data.levels.includes(cat);
                        return (
                            <button
                                key={cat}
                                onClick={() => isAvailable && setSelectedLevel(cat)}
                                disabled={!isAvailable}
                                className={`p-8 rounded-3xl border text-center transition-all ${isAvailable ? 'glass border-white/10 hover:border-primary/50 hover:bg-white/5 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10' : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'}`}
                            >
                                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isAvailable ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-500'}`}>
                                    <span className="material-symbols-outlined text-3xl">
                                        {cat === 'igcse' ? 'school' : 'history_edu'}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-100 mb-2">{formatLabel(cat)}</h3>
                                {isAvailable ? (
                                    <p className="text-slate-400 font-medium text-sm">
                                        {data.subjectsByLevel[cat]?.length || 0} Subjects Available
                                    </p>
                                ) : (
                                    <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Coming Soon</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Step 2: Select Subject
    if (!selectedSubject) {
        const subjects = data.subjectsByLevel[selectedLevel] || [];

        return (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                <button onClick={() => setSelectedLevel(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors font-medium text-sm mb-6">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Change Level
                </button>

                <div className="mb-8">
                    <h2 className="text-3xl font-black tracking-tight text-slate-100 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-xl">
                            {selectedLevel === 'igcse' ? '🏫' : '🎓'}
                        </span>
                        {formatLabel(selectedLevel)} Subjects
                    </h2>
                    <p className="text-slate-400 mt-2 ml-14">Select a subject to view available past papers.</p>
                </div>

                {subjects.length === 0 ? (
                    <div className="text-center p-12 glass border border-white/5 rounded-3xl text-slate-400">
                        <span className="material-symbols-outlined text-5xl mb-4 opacity-50">folder_off</span>
                        <h3 className="text-xl font-bold text-slate-200 mb-2">No subjects found</h3>
                        <p>There are no uploaded papers for this level yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {subjects.map(subject => {
                            // Count papers for this subject
                            const paperCount = data.documents.filter(d => d.subject === subject && d.level === selectedLevel && d.type === 'paper').length;

                            return (
                                <button
                                    key={subject}
                                    onClick={() => setSelectedSubject(subject)}
                                    className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/40 hover:bg-white/5 text-left transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group"
                                >
                                    <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-primary transition-colors">{formatLabel(subject)}</h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                                        <span className="material-symbols-outlined text-base">description</span>
                                        {paperCount} Papers
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // Step 3: Select Paper
    // Get distinct "paper" documents for this level and subject
    const papers = data.documents.filter(d => d.level === selectedLevel && d.subject === selectedSubject && d.type === 'paper');

    // Group papers by Paper Num -> Year -> Season based on Cambridge naming conventions (e.g., 9708_s25_qp_32)
    const groupedPapers = {};
    papers.forEach(paper => {
        const filename = paper.filename;
        const parts = filename.replace('.pdf', '').split('_');

        let paperNum = 'Other';
        let season = 'Unknown Season';
        let year = paper.year ? paper.year.toString() : 'Unknown Year';

        if (parts.length >= 4) {
            const seasonCode = parts[1][0].toLowerCase();
            if (seasonCode === 's') season = 'May-June';
            else if (seasonCode === 'w') season = 'Oct-Nov';
            else if (seasonCode === 'm') season = 'Feb-March';

            const paperCode = parts[3];
            if (paperCode && paperCode.length > 0 && !isNaN(paperCode[0])) {
                paperNum = `Paper ${paperCode[0]}`;
            }
        }

        if (!groupedPapers[paperNum]) groupedPapers[paperNum] = {};
        if (!groupedPapers[paperNum][year]) groupedPapers[paperNum][year] = {};
        if (!groupedPapers[paperNum][year][season]) groupedPapers[paperNum][year][season] = [];

        groupedPapers[paperNum][year][season].push(paper);
    });

    const sortedPaperNums = Object.keys(groupedPapers).sort();

    const handlePaperClick = (filename) => {
        router.push(`/past-papers/practice/${encodeURIComponent(filename)}`);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex items-center gap-4 text-slate-400 font-medium text-sm mb-6 bg-white/5 border border-white/5 w-fit rounded-xl p-1 px-3">
                <button onClick={() => { setSelectedLevel(null); setSelectedSubject(null); }} className="hover:text-white flex items-center transition-colors">
                    Levels
                </button>
                <span className="material-symbols-outlined text-sm opacity-50">chevron_right</span>
                <button onClick={() => setSelectedSubject(null)} className="hover:text-white flex items-center transition-colors">
                    {formatLabel(selectedLevel)}
                </button>
                <span className="material-symbols-outlined text-sm opacity-50">chevron_right</span>
                <span className="text-primary font-bold">{formatLabel(selectedSubject)}</span>
            </div>

            <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight text-slate-100">
                    Available Past Papers
                </h2>
                <p className="text-slate-400 mt-2">Select a paper to start practicing in the split-screen view.</p>
            </div>

            {papers.length === 0 ? (
                <div className="text-center p-12 glass border border-white/5 rounded-3xl text-slate-400">
                    <span className="material-symbols-outlined text-5xl mb-4 opacity-50">folder_off</span>
                    <h3 className="text-xl font-bold text-slate-200 mb-2">No papers found</h3>
                    <p>There are no uploaded past papers for {formatLabel(selectedSubject)} yet.</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {sortedPaperNums.map((paperNum) => {
                        const yearsObj = groupedPapers[paperNum];
                        const sortedYears = Object.keys(yearsObj).sort((a, b) => b.localeCompare(a));

                        return (
                            <div key={paperNum} className="space-y-6">
                                <h3 className="text-2xl font-black text-primary border-b border-primary/20 pb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined">folder_open</span>
                                    {paperNum}
                                </h3>

                                <div className="space-y-8 pl-4 border-l border-white/10 ml-3">
                                    {sortedYears.map(year => {
                                        const seasonsObj = yearsObj[year];
                                        const sortedSeasons = Object.keys(seasonsObj).sort();

                                        return (
                                            <div key={year} className="space-y-4">
                                                <h4 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm opacity-50">calendar_today</span>
                                                    {year}
                                                </h4>

                                                <div className="space-y-4 pl-4 border-l border-white/5 ml-2">
                                                    {sortedSeasons.map(season => (
                                                        <div key={season} className="space-y-3">
                                                            <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-xs">wb_sunny</span>
                                                                {season}
                                                            </h5>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {seasonsObj[season].sort((a, b) => a.filename.localeCompare(b.filename)).map((paper, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => handlePaperClick(paper.originalId)}
                                                                        className="glass p-5 rounded-2xl border border-white/5 hover:border-primary/50 hover:bg-white/5 text-left transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 flex items-start gap-4 group"
                                                                    >
                                                                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:text-primary transition-all">
                                                                            <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className="text-base font-bold text-slate-100 truncate mb-1 group-hover:text-primary transition-colors">
                                                                                {paper.filename.replace('.pdf', '')}
                                                                            </h4>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                                                    <span className="material-symbols-outlined text-[14px]">history_edu</span>
                                                                                    {formatLabel(selectedSubject)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="shrink-0 flex items-center h-12">
                                                                            <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">arrow_forward</span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
