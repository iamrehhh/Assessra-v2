'use client';

import { useState } from 'react';

const SUBJECTS = [
    'Economics', 'Business', 'Maths', 'Biology', 'Chemistry',
    'Physics', 'History', 'English', 'General Paper'
];
const LEVELS = ['IGCSE', 'A Level'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_TYPES = ['Structured', 'Essay', 'Multiple Choice', 'Data Response'];

export default function PracticeView() {
    // Step state: 'configure' | 'question' | 'results'
    const [step, setStep] = useState('configure');

    // Config
    const [subject, setSubject] = useState('Economics');
    const [level, setLevel] = useState('A Level');
    const [topic, setTopic] = useState('');
    const [marks, setMarks] = useState(8);
    const [difficulty, setDifficulty] = useState('Medium');
    const [questionType, setQuestionType] = useState('Structured');

    // Generated question data
    const [questionData, setQuestionData] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState('');

    // Answer + evaluation
    const [answer, setAnswer] = useState('');
    const [evaluating, setEvaluating] = useState(false);
    const [results, setResults] = useState(null);
    const [evalError, setEvalError] = useState('');

    // Expandable sections in results
    const [expanded, setExpanded] = useState({ breakdown: true, feedback: true, model: false, tip: true });

    // ── Generate a question ──────────────────────────────────────────
    const handleGenerate = async () => {
        if (!topic.trim()) { setGenError('Please enter a topic.'); return; }
        setGenerating(true);
        setGenError('');

        try {
            const subjectValue = subject.toLowerCase().replace(' ', '_');
            const levelValue = level === 'A Level' ? 'alevel' : 'igcse';

            const res = await fetch('/api/generate-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subjectValue,
                    level: levelValue,
                    topic: topic.trim(),
                    marks,
                    difficulty: difficulty.toLowerCase(),
                    questionType: questionType.toLowerCase().replace(' ', '_'),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate question');

            setQuestionData(data);
            setAnswer('');
            setResults(null);
            setStep('question');
        } catch (err) {
            setGenError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    // ── Evaluate the answer ──────────────────────────────────────────
    const handleSubmit = async () => {
        if (!answer.trim()) return;
        setEvaluating(true);
        setEvalError('');

        try {
            const subjectValue = subject.toLowerCase().replace(' ', '_');
            const levelValue = level === 'A Level' ? 'alevel' : 'igcse';

            const res = await fetch('/api/evaluate-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subjectValue,
                    level: levelValue,
                    question: questionData?.question || '',
                    markingScheme: questionData?.markingScheme || '',
                    studentAnswer: answer,
                    totalMarks: marks,
                    finalAnswerOnly: subject === 'Maths',
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to evaluate answer');

            setResults(data);
            setStep('results');
        } catch (err) {
            setEvalError(err.message);
        } finally {
            setEvaluating(false);
        }
    };

    // ── Score ring SVG helper ────────────────────────────────────────
    const ScoreRing = ({ awarded, total }) => {
        const pct = total > 0 ? (awarded / total) * 100 : 0;
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (circumference * Math.min(100, pct)) / 100;
        const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';

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
    // STEP 1: CONFIGURE
    // ═══════════════════════════════════════════════════════════════════
    if (step === 'configure') {
        return (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black tracking-tight text-slate-100">
                        <span className="text-primary">✨</span> AI Practice Mode
                    </h2>
                    <p className="text-slate-400">Generate custom Cambridge-style questions on any topic</p>
                </div>

                {/* Form Card */}
                <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
                    {/* Subject + Level */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                            <select value={subject} onChange={e => setSubject(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 font-medium focus:outline-none focus:border-primary/50 transition-colors">
                                {SUBJECTS.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Level</label>
                            <select value={level} onChange={e => setLevel(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 font-medium focus:outline-none focus:border-primary/50 transition-colors">
                                {LEVELS.map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Topic */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Topic</label>
                        <input
                            type="text" value={topic} onChange={e => setTopic(e.target.value)}
                            placeholder="e.g. price elasticity of demand, SWOT analysis, organic chemistry..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    {/* Marks + Question Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Marks</label>
                            <input type="number" value={marks} onChange={e => setMarks(parseInt(e.target.value) || 1)}
                                min={1} max={30}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 font-medium focus:outline-none focus:border-primary/50 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Question Type</label>
                            <select value={questionType} onChange={e => setQuestionType(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 font-medium focus:outline-none focus:border-primary/50 transition-colors">
                                {QUESTION_TYPES.map(qt => <option key={qt} value={qt} className="bg-slate-900">{qt}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Difficulty Pills */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Difficulty</label>
                        <div className="flex gap-2">
                            {DIFFICULTIES.map(d => (
                                <button key={d} onClick={() => setDifficulty(d)}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${difficulty === d
                                        ? 'bg-primary text-background-dark shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                                        }`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {genError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm font-medium">
                            {genError}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button onClick={handleGenerate} disabled={generating}
                        className={`w-full bg-primary hover:bg-primary/90 text-background-dark py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all ${generating ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:-translate-y-0.5'}`}>
                        {generating ? (
                            <>
                                <div className="w-5 h-5 border-3 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                                Generating your question...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">auto_awesome</span>
                                Generate Question ✨
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: QUESTION + ANSWER
    // ═══════════════════════════════════════════════════════════════════
    if (step === 'question') {
        return (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                {/* Back */}
                <button onClick={() => setStep('configure')}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors font-medium text-sm">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back to settings
                </button>

                {/* Question Card */}
                <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-5">
                    {/* Chips */}
                    <div className="flex flex-wrap gap-2">
                        <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary/30">
                            {subject}
                        </span>
                        <span className="bg-white/10 text-slate-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">
                            {level}
                        </span>
                        <span className="bg-white/10 text-slate-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">
                            {marks} marks
                        </span>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                difficulty === 'Hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                            {difficulty}
                        </span>
                    </div>

                    {/* Question text */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-100 mb-3">Question</h3>
                        <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-[15px]">
                            {questionData?.question || 'No question generated.'}
                        </div>
                    </div>

                    {/* Mark Allocation */}
                    {questionData?.markAllocation && (
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mark Allocation</p>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{questionData.markAllocation}</p>
                        </div>
                    )}
                </div>

                {/* Answer Area */}
                <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-100">Your Answer</h3>
                    <textarea
                        value={answer} onChange={e => setAnswer(e.target.value)}
                        rows={8}
                        placeholder="Type your answer here..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors resize-y min-h-[200px] leading-relaxed"
                    />

                    {evalError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm font-medium">
                            {evalError}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={handleSubmit} disabled={evaluating || !answer.trim()}
                            className={`flex-1 bg-primary hover:bg-primary/90 text-background-dark py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${(evaluating || !answer.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]'}`}>
                            {evaluating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                                    Evaluating...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">send</span>
                                    Submit Answer
                                </>
                            )}
                        </button>
                        <button onClick={() => { setStep('configure'); setQuestionData(null); }}
                            className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                            Generate Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: RESULTS
    // ═══════════════════════════════════════════════════════════════════
    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
            {/* Score Header */}
            <div className="glass rounded-3xl p-6 md:p-8 border border-white/5">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ScoreRing awarded={results?.marksAwarded || 0} total={results?.totalMarks || marks} />
                    <div className="text-center sm:text-left space-y-2">
                        <h2 className="text-2xl font-black text-slate-100">Your Score</h2>
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                            <span className={`text-4xl font-black ${(results?.percentage || 0) >= 70 ? 'text-green-400' :
                                    (results?.percentage || 0) >= 40 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                {results?.percentage || 0}%
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary/30">{subject}</span>
                            <span className="bg-white/10 text-slate-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">{topic}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Sections */}
            <div className="space-y-3">
                <Section icon="📋" title="Mark Breakdown" content={results?.breakdown || 'No breakdown available.'} id="breakdown" />
                <Section icon="💬" title="Feedback" content={results?.feedback || 'No feedback available.'} id="feedback" />
                <Section icon="✅" title="Model Answer" content={results?.modelAnswer || 'No model answer available.'} id="model" />
                <Section icon="💡" title="Examiner Tip" content={results?.examinerTip || 'No tip available.'} id="tip" />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => { setStep('configure'); setQuestionData(null); setAnswer(''); setResults(null); }}
                    className="flex-1 bg-primary hover:bg-primary/90 text-background-dark py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    Try Another Question
                </button>
                <button onClick={() => { setStep('question'); setResults(null); setAnswer(''); }}
                    className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                    Try Again
                </button>
            </div>
        </div>
    );
}
