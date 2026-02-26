'use client';

import { useState, useEffect } from 'react';

export default function SavedPracticeView() {
    const [savedSets, setSavedSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedSet, setSelectedSet] = useState(null); // The practice set currently being viewed

    // Expanded states for detailed view
    const [expanded, setExpanded] = useState({ breakdown: true, feedback: true, model: false, tip: true });

    useEffect(() => {
        fetchSavedSets();
    }, []);

    const fetchSavedSets = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/user/saved-practices');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch saved practices');
            setSavedSets(data.savedPractices || []);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation(); // Prevent opening the set details when clicking delete
        if (!confirm('Are you sure you want to delete this saved practice set?')) return;

        try {
            const res = await fetch(`/api/user/saved-practices?id=${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete');
            }
            // Remove from UI instantly
            setSavedSets(prev => prev.filter(s => s.id !== id));
            if (selectedSet && selectedSet.id === id) {
                setSelectedSet(null);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to delete: ' + err.message);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // ── Score ring SVG helper ────────────────────────────────────────
    const ScoreRing = ({ awarded, total, size = 'large' }) => {
        const pct = total > 0 ? (awarded / total) * 100 : 0;
        const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';

        if (size === 'small') {
            return (
                <div className="flex items-center gap-1.5 font-bold">
                    <span style={{ color }}>{awarded}</span>
                    <span className="text-slate-500 text-xs text-slate-500">/ {total}</span>
                </div>
            )
        }

        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (circumference * Math.min(100, pct)) / 100;

        return (
            <div className="relative flex items-center justify-center">
                <svg className="w-36 h-36 transform -rotate-90">
                    <circle cx="72" cy="72" r="54" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                    <circle cx="72" cy="72" r="54" fill="transparent" stroke={color} strokeWidth="10"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-100">{awarded}</span>
                    <span className="text-xs text-slate-500 font-bold">/ {total}</span>
                </div>
            </div>
        );
    };

    // ── Expandable section component ─────────────────────────────────
    const Section = ({ icon, title, content, id }) => (
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <button
                onClick={() => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <span className="font-bold text-slate-200">{title}</span>
                </div>
                <span className={`material-symbols-outlined text-slate-500 transition-transform ${expanded[id] ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>
            {expanded[id] && (
                <div className="px-5 pb-5 pt-0">
                    <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</div>
                </div>
            )}
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════
    // DETAILED VIEW MODE (MCQ + Non-MCQ)
    // ═══════════════════════════════════════════════════════════════════
    if (selectedSet) {
        const pd = selectedSet.practice_data;
        const isMcq = selectedSet.is_mcq;

        return (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                <div className="flex items-center justify-between">
                    <button onClick={() => setSelectedSet(null)}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors font-medium text-sm">
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Back to Saved Sets
                    </button>
                    <button onClick={(e) => handleDelete(selectedSet.id, e)} className="text-red-400/80 hover:text-red-400 flex items-center gap-1 text-sm font-bold transition-colors">
                        <span className="material-symbols-outlined text-base">delete</span> Delete
                    </button>
                </div>

                {/* Score Header */}
                <div className="glass rounded-3xl p-6 md:p-8 border border-white/5">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <ScoreRing awarded={selectedSet.score} total={selectedSet.max_marks} />
                        <div className="text-center sm:text-left space-y-2">
                            <h2 className="text-2xl font-black text-slate-100">Reviewing Practice</h2>
                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                                <span className={`text-4xl font-black ${(selectedSet.score / selectedSet.max_marks * 100) >= 70 ? 'text-green-400' :
                                    (selectedSet.score / selectedSet.max_marks * 100) >= 40 ? 'text-amber-400' : 'text-red-400'
                                    }`}>
                                    {Math.round(selectedSet.score / selectedSet.max_marks * 100)}%
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary/30">{selectedSet.subject.replace('_', ' ')}</span>
                                <span className="bg-white/10 text-slate-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">{selectedSet.topic}</span>
                                <span className={`${isMcq ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'} text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border`}>
                                    {isMcq ? 'MULTIPLE CHOICE' : 'STRUCTURED'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">{formatDate(selectedSet.created_at)}</p>
                        </div>
                    </div>
                </div>

                {/* Content based on type */}
                {isMcq ? (
                    <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-slate-100">Question Breakdown</h3>
                        <div className="space-y-4">
                            {pd.mcqQuestions.map((q, i) => {
                                const ans = pd.mcqAnswers[i];
                                return (
                                    <div key={i} className={`rounded-xl p-4 border ${ans?.isCorrect ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            <span className={`mt-1 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${ans?.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {ans?.isCorrect ? '✓' : '✕'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-200 mb-2">Q{i + 1}. {q.question}</p>
                                                {q.diagramUrl && (
                                                    <img src={q.diagramUrl} alt="diagram" className="max-h-48 object-contain rounded-lg border border-white/10 mb-3 bg-white" />
                                                )}
                                                <p className="text-xs text-slate-400 bg-black/20 p-2 rounded-lg mb-2">
                                                    Your Answer: <span className={ans?.isCorrect ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{ans?.selected}: {q.options[ans?.selected]}</span>
                                                </p>
                                                {!ans?.isCorrect && (
                                                    <p className="text-xs text-slate-400 bg-black/20 p-2 rounded-lg mb-2">
                                                        Correct Answer: <span className="text-green-400 font-bold">{ans?.correct}: {q.options[ans?.correct]}</span>
                                                    </p>
                                                )}
                                                <div className="text-xs text-slate-500 mt-2 bg-white/5 p-3 rounded-lg border border-white/5">
                                                    <span className="font-bold text-slate-400">Explanation:</span> {q.explanation}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-4">
                            <h3 className="text-lg font-bold text-slate-100">Question</h3>
                            {pd.questionData?.diagramUrl && (
                                <img src={pd.questionData.diagramUrl} alt="diagram" className="w-full max-h-64 object-contain rounded-xl border border-white/10 mb-4 bg-white" />
                            )}
                            <div className="text-[15px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {pd.questionData?.question}
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Your Answer</h3>
                                <div className="text-[15px] text-slate-200 whitespace-pre-wrap leading-relaxed italic bg-black/20 p-4 rounded-xl">
                                    {pd.answer}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Section icon="📋" title="Mark Breakdown" content={pd.results?.breakdown || 'N/A'} id="breakdown" />
                            <Section icon="💬" title="Feedback" content={pd.results?.feedback || 'N/A'} id="feedback" />
                            <Section icon="✅" title="Model Answer" content={pd.results?.modelAnswer || 'N/A'} id="model" />
                            <Section icon="💡" title="Examiner Tip" content={pd.results?.examinerTip || 'N/A'} id="tip" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIST VIEW
    // ═══════════════════════════════════════════════════════════════════
    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white mb-2">
                    <span className="text-primary material-symbols-outlined align-middle mr-2 text-4xl">bookmarks</span>
                    Saved Sets
                </h1>
                <p className="text-slate-400 text-lg">Review and learn from your previous AI practice sessions.</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 font-medium">Loading saved history...</p>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center text-red-400">
                    <span className="material-symbols-outlined text-4xl mb-2">error</span>
                    <p className="font-bold">{error}</p>
                    <button onClick={fetchSavedSets} className="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors">
                        Try Again
                    </button>
                </div>
            ) : savedSets.length === 0 ? (
                <div className="glass rounded-3xl p-12 border border-white/5 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <span className="material-symbols-outlined text-4xl text-slate-500">book</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-200 mb-2">No Saved Sets Yet</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Practice makes perfect! Generate some AI Practice sets and click "Save Set" to build your review library.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedSets.map(set => (
                        <div key={set.id}
                            onClick={() => setSelectedSet(set)}
                            className="glass rounded-2xl p-6 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden">
                            {/* Card Glow */}
                            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none ${set.is_mcq ? 'bg-amber-500' : 'bg-cyan-500'}`} />

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <ScoreRing awarded={set.score} total={set.max_marks} size="small" />
                                <button onClick={(e) => handleDelete(set.id, e)} className="text-slate-600 hover:text-red-400 transition-colors">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>

                            <h3 className="font-bold text-slate-100 text-lg mb-1 line-clamp-2 relative z-10 leading-snug">{set.topic}</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 relative z-10">{set.subject.replace('_', ' ')}</p>

                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                                <span className={`${set.is_mcq ? 'text-amber-500/80 bg-amber-500/10 border-amber-500/20' : 'text-cyan-500/80 bg-cyan-500/10 border-cyan-500/20'} text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border`}>
                                    {set.is_mcq ? 'MCQ' : 'STRUCTURED'}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                    {formatDate(set.created_at)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
