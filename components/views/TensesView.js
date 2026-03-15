'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { tensesData } from '@/data/tenses';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

export default function TensesView() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState('practice');
    const [practiceState, setPracticeState] = useState('idle');
    const [currentSet, setCurrentSet] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [aiData, setAiData] = useState(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [savedSets, setSavedSets] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [viewingSet, setViewingSet] = useState(null);

    const shuffle = (arr) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    const loadSavedSets = async () => {
        try {
            const res = await fetch('/api/user/saved-practices');
            if (res.ok) {
                const data = await res.json();
                setSavedSets((data.savedPractices || []).filter(s => s.subject === 'tenses'));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { if (session?.user) loadSavedSets(); }, [session]);

    const startPractice = () => {
        const selected = shuffle(tensesData).slice(0, 5);
        setCurrentSet(selected);
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setAiData(null);
        setPracticeState('practicing');
    };

    const getQuestionText = (item) => {
        if (item.type === 'fillin') return 'Fill in the blank with the correct verb form:';
        if (item.type === 'match') return item.question;
        if (item.type === 'error') return 'Find the part with the grammatical error:';
        if (item.type === 'statements') return 'Evaluate the two statements and choose the correct option:';
        if (item.type === 'correct') return item.prompt;
        if (item.type === 'rearrange') return item.question;
        if (item.type === 'passage') return item.question;
        if (item.type === 'assertion') return 'Evaluate the Assertion [A] and Reason [R]:';
        if (item.type === 'incorrect') return item.question;
        if (item.type === 'oddone') return item.question;
        if (item.type === 'correction') return item.question;
        return item.question || '';
    };

    const handleOptionClick = async (key) => {
        if (isAnswered) return;
        setSelectedOption(key);
        setIsAnswered(true);
        setLoadingAi(true);
        setAiData(null);

        const item = currentSet[currentIndex];
        const isCorrect = key === item.answer;

        setCurrentSet(prev => {
            const next = [...prev];
            next[currentIndex] = { ...next[currentIndex], userAnswer: key, isCorrect };
            return next;
        });

        try {
            const res = await fetch('/api/tenses-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionType: item.format || item.type,
                    questionText: getQuestionText(item),
                    options: item.parts,
                    answer: item.answer,
                    userAnswer: key,
                    explanation: item.explanation
                })
            });
            if (res.ok) {
                const data = await res.json();
                setAiData(data);
                setCurrentSet(prev => {
                    const next = [...prev];
                    next[currentIndex] = { ...next[currentIndex], aiData: data };
                    return next;
                });
            }
        } catch (e) { console.error(e); }
        finally { setLoadingAi(false); }
    };

    const nextItem = () => {
        if (currentIndex < currentSet.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setAiData(null);
        } else {
            fetch('/api/scores/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paperId: `tenses_${Date.now()}`, paperTitle: 'Review - Tenses',
                    subject: 'tenses', questionNumber: 'all',
                    score: currentSet.filter(i => i.isCorrect).length, maxMarks: currentSet.length
                })
            }).catch(() => {});
            setPracticeState('results');
        }
    };

    const saveCurrentSet = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/user/saved-practices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: 'tenses', topic: 'Tenses', is_mcq: true,
                    score: currentSet.filter(i => i.isCorrect).length,
                    max_marks: currentSet.length, practice_data: currentSet
                })
            });
            if (res.ok) loadSavedSets();
        } catch (e) { console.error(e); }
        finally { setTimeout(() => setIsSaving(false), 800); }
    };

    // ── Option button (shared across all formats) ──
    const OptionBtn = ({ optKey, text, item, isViewMode = false }) => {
        const answered = isViewMode || isAnswered;
        const selected = isViewMode ? item.userAnswer : selectedOption;
        let cls = 'bg-black/5 dark:bg-white/5 border-border-main text-text-main hover:bg-black/10 dark:hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-sm';
        if (answered) {
            if (optKey === item.answer) cls = 'bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-300';
            else if (optKey === selected) cls = 'bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-300';
            else cls = 'bg-black/5 border-border-main text-text-muted opacity-50';
        }
        const badge = answered && optKey === item.answer ? '✓' : answered && optKey === selected ? '✕' : optKey;
        const badgeCls = answered && optKey === item.answer ? 'border-green-500 bg-green-500 text-white'
            : answered && optKey === selected ? 'border-red-500 bg-red-500 text-white'
            : 'border-border-main bg-white dark:bg-black shadow-sm';
        return (
            <button onClick={() => !isViewMode && handleOptionClick(optKey)} disabled={answered}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 font-medium flex items-start gap-3 ${cls}`}>
                <span className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${badgeCls}`}>{badge}</span>
                <span className="leading-relaxed text-sm md:text-base">{text}</span>
            </button>
        );
    };

    // ── Format-specific question body renderers ──
    const renderQuestionBody = (item, isViewMode = false) => {
        // MATCH format
        if (item.type === 'match') {
            return (
                <div className="mb-5 bg-black/5 dark:bg-white/5 rounded-xl p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-text-muted text-xs font-bold uppercase tracking-wider">
                                <th className="text-left pb-2 pr-4">List-I</th>
                                <th className="text-left pb-2">List-II</th>
                            </tr>
                        </thead>
                        <tbody>
                            {OPTION_KEYS.map((k, i) => (
                                <tr key={k} className="border-t border-border-main/30">
                                    <td className="py-2 pr-4 align-top"><span className="font-bold text-primary mr-1">{k}.</span> {item.listI[k]}</td>
                                    <td className="py-2 align-top text-text-muted"><span className="font-bold mr-1">{['I','II','III','IV'][i]}.</span> {item.listII[['I','II','III','IV'][i]]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // FILL-IN-BLANK format — highlight the blank
        if (item.type === 'fillin') {
            const parts = item.sentence.split('___');
            return (
                <div className="mb-5 bg-black/5 dark:bg-white/5 rounded-xl p-5 text-center">
                    <p className="text-base md:text-lg font-semibold text-text-main leading-relaxed">
                        {parts[0]}
                        <span className="inline-block border-b-2 border-primary mx-1 px-4 font-bold text-primary min-w-[80px] text-center">
                            {isAnswered ? item.answer : '?'}
                        </span>
                        {parts[1]}
                    </p>
                </div>
            );
        }

        // ERROR DETECTION format — assembled sentence with highlighted error after answer
        if (item.type === 'error') {
            return (
                <div className="mb-5 bg-black/5 dark:bg-white/5 rounded-xl p-5">
                    <p className="text-base md:text-lg font-semibold text-text-main leading-relaxed text-center">
                        {['A','B','C'].map((k, i) => (
                            <span key={k} className={
                                (isAnswered || isViewMode) && k === item.answer
                                    ? 'text-red-500 font-bold underline decoration-red-400 decoration-2'
                                    : 'text-text-main'
                            }>
                                {item.parts[k]}{i < 2 ? ' ' : ''}
                            </span>
                        ))}
                    </p>
                    <p className="text-xs text-text-muted text-center mt-2 font-medium">
                        Select the part with the error, or D if there is no error
                    </p>
                </div>
            );
        }

        // STATEMENTS format
        if (item.type === 'statements') {
            return (
                <div className="mb-5 space-y-3">
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">Statement I</span>
                        <p className="text-sm text-text-main leading-relaxed">{item.statementI}</p>
                    </div>
                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest block mb-1">Statement II</span>
                        <p className="text-sm text-text-main leading-relaxed">{item.statementII}</p>
                    </div>
                </div>
            );
        }

        // REARRANGE format
        if (item.type === 'rearrange') {
            const pqrs = ['P','Q','R','S'];
            const pqrsVals = [item.partsP, item.partsQ, item.partsR, item.partsS];
            return (
                <div className="mb-5 bg-black/5 dark:bg-white/5 rounded-xl p-4 space-y-2">
                    {pqrs.map((label, i) => (
                        <div key={label} className="flex items-start gap-2 text-sm text-text-main">
                            <span className="font-bold text-primary shrink-0 w-5">{label}.</span>
                            <span>{pqrsVals[i]}</span>
                        </div>
                    ))}
                </div>
            );
        }

        // PASSAGE format
        if (item.type === 'passage') {
            return (
                <div className="mb-5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block mb-2">Passage</span>
                    <p className="text-sm text-text-main leading-relaxed">{item.passage}</p>
                </div>
            );
        }

        // ASSERTION-REASON format
        if (item.type === 'assertion') {
            return (
                <div className="mb-5 space-y-3">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-1">Assertion [A]</span>
                        <p className="text-sm text-text-main leading-relaxed">{item.assertion}</p>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block mb-1">Reason [R]</span>
                        <p className="text-sm text-text-main leading-relaxed">{item.reason}</p>
                    </div>
                </div>
            );
        }

        // SENTENCE CORRECTION format
        if (item.type === 'correction') {
            return (
                <div className="mb-5 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest block mb-1">Incorrect Sentence</span>
                    <p className="text-sm text-text-main leading-relaxed font-medium">{item.original}</p>
                </div>
            );
        }

        return null;
    };

    const renderTabs = () => (
        <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl w-full max-w-lg mx-auto mb-8">
            {['practice', 'saved'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all capitalize flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    {tab === 'saved' && <span className="material-symbols-outlined text-sm">bookmark</span>}
                    {tab === 'practice' ? 'Practice' : 'Saved'}
                </button>
            ))}
        </div>
    );

    // ════════════ IDLE ════════════
    if (practiceState === 'idle') {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
                <div>
                    <h1 className="text-3xl font-black text-text-main tracking-tight">Tenses</h1>
                    <p className="text-text-muted mt-2">Master English tenses with AI-powered explanations.</p>
                </div>

                {viewingSet ? (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => setViewingSet(null)}
                                className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors font-medium text-sm bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl">
                                <span className="material-symbols-outlined text-sm">arrow_back</span> Back
                            </button>
                            <div className="text-sm font-bold text-text-main">{viewingSet.score}/{viewingSet.max_marks} Score</div>
                        </div>
                        {viewingSet.practice_data && viewingSet.practice_data.map((item, idx) => (
                            <div key={idx} className={`glass p-6 rounded-[2rem] border-2 shadow-sm ${item.isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1 rounded-lg">{item.section}</span>
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${item.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                        <span className="material-symbols-outlined text-sm">{item.isCorrect ? 'check' : 'close'}</span>
                                    </span>
                                </div>
                                <p className="font-semibold text-text-main text-sm mb-4">{getQuestionText(item)}</p>
                                {renderQuestionBody(item, true)}
                                <div className="space-y-2 mb-4">
                                    {OPTION_KEYS.map(k => <OptionBtn key={k} optKey={k} text={item.parts[k]} item={item} isViewMode={true} />)}
                                </div>
                                <div className="flex gap-6 mb-3">
                                    <div><span className="text-xs font-bold text-text-muted uppercase tracking-widest block">Correct</span><p className="text-primary font-bold text-lg">{item.answer}</p></div>
                                    {item.userAnswer && <div><span className="text-xs font-bold text-text-muted uppercase tracking-widest block">You chose</span><p className={`font-bold text-lg ${item.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{item.userAnswer}</p></div>}
                                </div>
                                {(item.aiData || item.explanation) && (
                                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4">
                                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">lightbulb</span> Explanation
                                        </span>
                                        <p className="text-text-main text-sm leading-relaxed mt-1">{item.aiData ? item.aiData.explanation : item.explanation}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {renderTabs()}
                        {activeTab === 'saved' ? (
                            <div className="space-y-4">
                                {savedSets.length === 0 ? (
                                    <div className="glass p-10 rounded-3xl border border-border-main text-center">
                                        <p className="text-text-muted font-medium">No saved sets yet.</p>
                                        <p className="text-text-muted text-sm mt-1">Complete a session and save it to review later.</p>
                                    </div>
                                ) : savedSets.map(set => (
                                    <div key={set.id} className="glass p-6 rounded-2xl border border-border-main flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-lg uppercase tracking-wider">tenses</span>
                                                <span className="text-text-muted text-sm">{new Date(set.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="font-bold text-text-main text-sm">Tenses Practice Set</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-xl font-black text-text-main">{set.score}/{set.max_marks}</div>
                                            <button onClick={() => setViewingSet(set)} className="mt-2 px-4 py-1.5 bg-text-main text-bg-base text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">View</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass p-10 rounded-3xl border border-border-main text-center shadow-sm">
                                <div className="w-20 h-20 bg-sky-500/10 text-sky-600 dark:text-sky-400 mx-auto rounded-full flex items-center justify-center mb-6 ring-8 ring-sky-500/5">
                                    <span className="material-symbols-outlined text-4xl">schedule</span>
                                </div>
                                <h2 className="text-2xl font-bold text-text-main mb-3">Tenses Practice</h2>
                                <ul className="text-text-muted max-w-lg mx-auto mb-8 leading-relaxed list-disc text-left pl-10 space-y-2">
                                    <li>5 questions per session from a bank of <strong>115 tense-based questions</strong>.</li>
                                    <li>13 formats: Match-List, Fill-in-Blank, Error Detection, Rearrange, Cloze Passage, Assertion-Reason, and more.</li>
                                    <li>AI generates rich, rule-based explanations instantly after each answer.</li>
                                </ul>
                                <button onClick={startPractice} className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_12px_25px_rgba(34,197,94,0.4)] hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto">
                                    <span>Start Practice</span>
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    // ════════════ RESULTS ════════════
    if (practiceState === 'results') {
        const finalScore = currentSet.filter(i => i.isCorrect).length;
        return (
            <div className="max-w-4xl mx-auto animate-fade-in text-center py-10">
                <div className="text-7xl mb-6 animate-bounce">🎉</div>
                <h2 className="text-4xl font-black text-text-main mb-2">Session Complete!</h2>
                <div className="text-6xl font-black text-primary mb-6">{finalScore}/{currentSet.length}</div>
                <p className="text-text-muted text-lg max-w-md mx-auto mb-10">
                    {finalScore === currentSet.length ? 'Flawless! You have mastered these tenses.' : 'Review the AI explanations — every mistake is a lesson in disguise!'}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button onClick={() => setPracticeState('idle')} className="w-full sm:w-auto px-8 py-4 bg-black/5 dark:bg-white/5 text-text-main font-bold rounded-2xl border border-border-main hover:bg-black/10 transition-colors">Return Home</button>
                    <button onClick={saveCurrentSet} disabled={isSaving} className="w-full sm:w-auto px-8 py-4 bg-blue-500 text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(59,130,246,0.3)] hover:-translate-y-1 transition-all flex items-center gap-2 justify-center disabled:opacity-70">
                        <span className="material-symbols-outlined text-sm">{isSaving ? 'check' : 'bookmark_add'}</span>
                        <span>{isSaving ? 'Saved!' : 'Save This Set'}</span>
                    </button>
                    <button onClick={startPractice} className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(34,197,94,0.3)] hover:-translate-y-1 transition-all flex items-center gap-2 justify-center">
                        <span className="material-symbols-outlined text-sm">refresh</span> Practice Again
                    </button>
                </div>
            </div>
        );
    }

    // ════════════ PRACTICING ════════════
    const item = currentSet[currentIndex];
    const progress = (currentIndex / currentSet.length) * 100;

    return (
        <div className="max-w-3xl mx-auto animate-fade-in py-8 pt-2">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => setPracticeState('idle')} className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors font-medium text-sm bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl">
                    <span className="material-symbols-outlined text-sm">close</span> Quit
                </button>
                <div className="text-sm font-bold text-text-muted tracking-widest uppercase">Q {currentIndex + 1} / {currentSet.length}</div>
            </div>

            <div className="h-2 w-full bg-border-main rounded-full overflow-hidden mb-6">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.max(5, progress)}%` }} />
            </div>

            <div className="glass p-6 md:p-10 rounded-[2rem] border border-border-main shadow-lg">
                {/* Section badge + format tag */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1 rounded-lg">{item.section}</span>
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest bg-sky-500/10 px-3 py-1 rounded-lg">{item.format}</span>
                </div>

                {/* Main question text */}
                <p className="text-base font-semibold text-text-main mb-4 leading-relaxed">{getQuestionText(item)}</p>

                {/* Format-specific body */}
                {renderQuestionBody(item)}

                {/* Options */}
                <div className="space-y-3">
                    {OPTION_KEYS.map(k => <OptionBtn key={k} optKey={k} text={item.parts[k]} item={item} />)}
                </div>

                {/* AI Explanation */}
                {isAnswered && (
                    <div className="mt-8 pt-8 border-t border-border-main animate-fade-in space-y-5">
                        {loadingAi ? (
                            <div className="bg-primary/5 p-6 rounded-2xl flex flex-col items-center gap-3">
                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <p className="text-sm text-primary font-medium animate-pulse">Generating explanation...</p>
                            </div>
                        ) : aiData ? (
                            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-2">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">lightbulb</span> Explanation
                                </span>
                                <p className="text-text-main text-sm leading-relaxed">{aiData.explanation}</p>
                            </div>
                        ) : null}
                        <div className="flex justify-end">
                            <button onClick={nextItem} className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(34,197,94,0.3)] hover:-translate-y-1 transition-all flex items-center gap-2 w-full md:w-auto justify-center">
                                <span>{currentIndex === currentSet.length - 1 ? 'Finish Set' : 'Next Question'}</span>
                                <span className="material-symbols-outlined text-sm">{currentIndex === currentSet.length - 1 ? 'done_all' : 'arrow_forward'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
