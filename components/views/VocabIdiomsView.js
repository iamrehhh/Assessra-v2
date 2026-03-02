'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { vocabData, idiomsData } from '@/data/vocabIdioms';

export default function VocabIdiomsView() {
    const { data: session } = useSession();

    const [activeTab, setActiveTab] = useState('vocab'); // 'vocab' or 'idioms'
    const [practiceState, setPracticeState] = useState('idle'); // 'idle', 'practicing', 'results'

    // Practice Session State
    const [currentSet, setCurrentSet] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);

    // AI Enhancement State
    const [aiData, setAiData] = useState(null);
    const [loadingAi, setLoadingAi] = useState(false);

    // Helper to shuffle an array
    const shuffle = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    const startPractice = () => {
        const sourceData = activeTab === 'vocab' ? vocabData : idiomsData;
        const shuffled = shuffle(sourceData);
        // Take 5 items (or less if data is smaller)
        const selected = shuffled.slice(0, Math.min(5, shuffled.length));

        setCurrentSet(selected);
        setCurrentIndex(0);
        setIsRevealed(false);
        setAiData(null);
        setPracticeState('practicing');
    };

    const handleReveal = async () => {
        setIsRevealed(true);
        setLoadingAi(true);
        setAiData(null);

        const currentItem = currentSet[currentIndex];
        const term = activeTab === 'vocab' ? currentItem.word : currentItem.idiom;
        const meaning = currentItem.meaning;

        try {
            const res = await fetch('/api/vocab-idiom-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    term,
                    type: activeTab,
                    meaning
                })
            });

            if (res.ok) {
                const data = await res.json();
                setAiData(data);
            } else {
                console.error("Failed to fetch AI context");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingAi(false);
        }
    };

    const nextItem = () => {
        if (currentIndex < currentSet.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsRevealed(false);
            setAiData(null);
        } else {
            setPracticeState('results');
        }
    };

    // Render Idle State (Landing)
    if (practiceState === 'idle') {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-text-main tracking-tight">Vocabulary & Idioms</h1>
                        <p className="text-text-muted mt-2">Master confusing words and expressions with AI-generated context.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl w-full md:max-w-sm">
                    <button
                        onClick={() => setActiveTab('vocab')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'vocab' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        Vocabulary
                    </button>
                    <button
                        onClick={() => setActiveTab('idioms')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'idioms' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        Idioms
                    </button>
                </div>

                <div className="glass p-10 rounded-3xl border border-border-main text-center shadow-sm">
                    <div className="w-20 h-20 bg-primary/10 text-primary mx-auto rounded-full flex items-center justify-center mb-6 ring-8 ring-primary/5">
                        <span className="material-symbols-outlined text-4xl">
                            {activeTab === 'vocab' ? 'spellcheck' : 'forum'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-text-main mb-3">
                        {activeTab === 'vocab' ? 'Vocabulary Practice' : 'Idioms Practice'}
                    </h2>
                    <p className="text-text-muted max-w-lg mx-auto mb-8 leading-relaxed">
                        Start a lightning-fast session of 5 items. The AI will provide examples and common synonyms to help you naturally remember the definitions.
                    </p>
                    <button
                        onClick={startPractice}
                        className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_12px_25px_rgba(34,197,94,0.4)] hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto"
                    >
                        <span>Start Practice</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            </div>
        );
    }

    // Render Results State
    if (practiceState === 'results') {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-center py-20">
                <div className="text-7xl mb-6 animate-bounce">
                    🎉
                </div>
                <h2 className="text-4xl font-black text-text-main mb-4">Practice Complete!</h2>
                <p className="text-text-muted text-lg max-w-md mx-auto mb-10">
                    You've successfully reviewed {currentSet.length} {activeTab === 'vocab' ? 'vocabulary words' : 'idioms'}. Consistency is the key to mastery!
                </p>

                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setPracticeState('idle')}
                        className="px-8 py-4 bg-black/5 dark:bg-white/5 text-text-main font-bold rounded-2xl border border-border-main hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                        Return Home
                    </button>
                    <button
                        onClick={startPractice}
                        className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_12px_25px_rgba(34,197,94,0.4)] hover:-translate-y-1 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        <span>Practice Again</span>
                    </button>
                </div>
            </div>
        );
    }

    // Render Practicing State
    const currentItem = currentSet[currentIndex];
    const term = activeTab === 'vocab' ? currentItem.word : currentItem.idiom;
    const progressPercent = ((currentIndex) / currentSet.length) * 100;

    return (
        <div className="max-w-3xl mx-auto animate-fade-in py-8 pt-2">

            {/* Header & Progress */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => setPracticeState('idle')}
                    className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors font-medium text-sm bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                    Quit Session
                </button>
                <div className="text-sm font-bold text-text-muted tracking-widest uppercase">
                    {activeTab === 'vocab' ? 'Word' : 'Idiom'} {currentIndex + 1} of {currentSet.length}
                </div>
            </div>

            <div className="h-2 w-full bg-border-main rounded-full overflow-hidden mb-12">
                <div
                    className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    style={{ width: `${Math.max(5, progressPercent)}%` }}
                ></div>
            </div>

            {/* Flashcard Area */}
            <div className="glass p-8 md:p-12 rounded-[2rem] border border-border-main shadow-lg relative overflow-hidden transition-all duration-300">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-10 -mt-10"></div>

                <h2 className="text-3xl md:text-5xl font-black text-text-main text-center mb-8 relative z-10 font-serif italic">
                    "{term}"
                </h2>

                {!isRevealed ? (
                    <div className="text-center pt-8">
                        <button
                            onClick={handleReveal}
                            className="px-8 py-4 bg-text-main text-bg-base font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mx-auto w-full md:w-auto"
                        >
                            <span className="material-symbols-outlined">visibility</span>
                            Reveal Meaning
                        </button>
                        <p className="mt-4 text-sm text-text-muted">Think of the definition before reviewing.</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in border-t border-border-main pt-8">
                        <div>
                            <span className="text-xs font-bold text-primary uppercase tracking-widest mb-1 block">Definition</span>
                            <p className="text-lg md:text-xl text-text-main font-medium leading-relaxed">
                                {currentItem.meaning}
                            </p>
                        </div>

                        {/* AI Loading State */}
                        {loadingAi && (
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-sm text-primary font-medium animate-pulse">Generating context...</p>
                            </div>
                        )}

                        {/* AI Loaded State */}
                        {aiData && !loadingAi && (
                            <div className="bg-primary/5 border border-border-main rounded-2xl p-6 space-y-5 animate-fade-in shadow-inner">
                                <div>
                                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">format_quote</span>
                                        Example
                                    </span>
                                    <p className="text-text-main text-lg italic bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-white/40 dark:border-white/5 shadow-sm">
                                        "{aiData.example}"
                                    </p>
                                </div>
                                {aiData.synonyms && aiData.synonyms.length > 0 && (
                                    <div>
                                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">link</span>
                                            Synonyms
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {aiData.synonyms.map((syn, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1 bg-white/60 dark:bg-white/10 border border-border-main rounded-lg text-sm font-semibold text-text-main shadow-sm"
                                                >
                                                    {syn}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-6 flex justify-end">
                            <button
                                onClick={nextItem}
                                className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(34,197,94,0.3)] hover:-translate-y-1 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
                            >
                                <span>{currentIndex === currentSet.length - 1 ? 'Finish Set' : 'Next Item'}</span>
                                <span className="material-symbols-outlined text-sm">
                                    {currentIndex === currentSet.length - 1 ? 'done_all' : 'arrow_forward'}
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
