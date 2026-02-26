'use client';

import { useState, useEffect } from 'react';

const SUBJECTS = [
    'Economics', 'Business', 'Maths', 'Biology', 'Chemistry',
    'Physics', 'History', 'English', 'General Paper'
];
const LEVELS = ['IGCSE', 'A Level'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_TYPES = ['Structured', 'Essay', 'Multiple Choice', 'Data Response'];

export default function PracticeView() {
    const toast = useToast();
    // Step state: 'configure' | 'question' | 'results' | 'mcq_quiz' | 'mcq_summary'
    const [step, setStep] = useState('configure');

    // Config
    const [subject, setSubject] = useState('Economics');
    const [level, setLevel] = useState('A Level');
    const [topic, setTopic] = useState('');
    const [marks, setMarks] = useState(8);
    const [difficulty, setDifficulty] = useState('Medium');
    const [questionType, setQuestionType] = useState('Structured');

    // Generated question data (non-MCQ)
    const [questionData, setQuestionData] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState('');

    // Answer + evaluation (non-MCQ)
    const [answer, setAnswer] = useState('');
    const [evaluating, setEvaluating] = useState(false);
    const [results, setResults] = useState(null);
    const [evalError, setEvalError] = useState('');

    // Expandable sections in results
    const [expanded, setExpanded] = useState({ breakdown: true, feedback: true, model: false, tip: true });

    // MCQ quiz state
    const [mcqQuestions, setMcqQuestions] = useState([]);
    const [mcqIndex, setMcqIndex] = useState(0);
    const [mcqSelected, setMcqSelected] = useState(null);     // selected option letter
    const [mcqSubmitted, setMcqSubmitted] = useState(false);   // has answered current question
    const [mcqAnswers, setMcqAnswers] = useState([]);          // [{selected, correct, isCorrect}]

    // Diagram budget tracking: max 2 diagram questions per subject per session
    const [diagramCount, setDiagramCount] = useState({});

    // Save practice session state
    const [isSaving, setIsSaving] = useState(false);
    const [savedSetId, setSavedSetId] = useState(null);

    // ── Save Practice Session ──────────────────────────────────────────
    const handleSaveSet = async (isMcq) => {
        if (isSaving || savedSetId) return;
        setIsSaving(true);
        try {
            const subjectValue = subject.toLowerCase().replace(' ', '_');
            const practiceData = isMcq ? { mcqQuestions, mcqAnswers } : { questionData, answer, results };

            const reqBody = {
                subject: subjectValue,
                topic: topic.trim() || (isMcq ? '' : questionData?.topic) || 'Practice Set',
                is_mcq: isMcq,
                score: isMcq ? mcqAnswers.filter(a => a.isCorrect).length : (results?.marksAwarded || 0),
                max_marks: isMcq ? mcqAnswers.length : (results?.totalMarks || marks),
                practice_data: practiceData
            };

            const res = await fetch('/api/user/saved-practices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqBody)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            setSavedSetId(data.savedPractice.id);
            toast('Practice set saved successfully!', 'success');
        } catch (err) {
            console.error('Save practice error:', err);
            toast('Failed to save practice set', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // ── MCQ Summary Logging (Moved to top level) ─────────────────────
    useEffect(() => {
        if (step === 'mcq_summary') {
            const correctCount = mcqAnswers.filter(a => a.isCorrect).length;
            const totalCount = mcqAnswers.length;
            const subjectValue = subject.toLowerCase().replace(' ', '_');
            const levelValue = level === 'A Level' ? 'alevel' : 'igcse';

            // Log AI Practice session
            fetch('/api/practice-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subjectValue,
                    level: levelValue,
                    topic: topic.trim(),
                    questionType: 'multiple_choice',
                    difficulty: difficulty.toLowerCase(),
                    marks: totalCount,
                    score: correctCount
                })
            }).catch(() => { });

            // Integrate with Daily Progress / Streak
            fetch('/api/scores/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paperId: `ai_practice_mcq_${Date.now()}`,
                    paperTitle: `AI MCQ - ${topic.trim() || 'General'}`,
                    subject: subjectValue,
                    questionNumber: 'all',
                    score: correctCount,
                    maxMarks: totalCount
                })
            }).catch(() => { });
        }
    }, [step]); // Only run when step changes

    // ── Generate a question ──────────────────────────────────────────
    const handleGenerate = async () => {
        if (!topic.trim()) { setGenError('Please enter a topic.'); return; }
        setGenerating(true);
        setGenError('');

        try {
            const subjectValue = subject.toLowerCase().replace(' ', '_');
            const levelValue = level === 'A Level' ? 'alevel' : 'igcse';

            setSavedSetId(null); // Reset saved status on new generation

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
                    diagramBudgetRemaining: 2 - (diagramCount[subject] || 0),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.error || 'Failed to generate question');

            // MCQ mode: sequential quiz flow
            if (data.mcqMode) {
                setMcqQuestions(data.mcqQuestions);
                setMcqIndex(0);
                setMcqSelected(null);
                setMcqSubmitted(false);
                setMcqAnswers([]);
                // Track diagrams generated in this MCQ batch
                if (data.diagramsGenerated > 0) {
                    setDiagramCount(prev => ({
                        ...prev,
                        [subject]: (prev[subject] || 0) + data.diagramsGenerated
                    }));
                }
                setStep('mcq_quiz');

                // Fire-and-forget log for starting an MCQ quiz
                fetch('/api/practice-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subject: subjectValue,
                        level: levelValue,
                        topic: topic.trim(),
                        questionType: 'multiple_choice',
                        difficulty: difficulty.toLowerCase(),
                        marks, // This is the number of questions for MCQ
                    })
                }).catch(() => { });
            } else {
                setQuestionData(data);
                setAnswer('');
                setResults(null);
                // Track diagram if one was generated
                if (data.hasDiagram) {
                    setDiagramCount(prev => ({
                        ...prev,
                        [subject]: (prev[subject] || 0) + 1
                    }));
                }
                setStep('question');
            }
        } catch (err) {
            setGenError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    // ── MCQ: Submit current answer ───────────────────────────────────
    const handleMcqSubmit = () => {
        if (!mcqSelected || mcqSubmitted) return;
        const current = mcqQuestions[mcqIndex];
        const isCorrect = mcqSelected === current.correct;
        setMcqSubmitted(true);
        setMcqAnswers(prev => [...prev, {
            questionIndex: mcqIndex,
            selected: mcqSelected,
            correct: current.correct,
            isCorrect,
        }]);
    };

    // ── MCQ: Go to next question or summary ──────────────────────────
    const handleMcqNext = () => {
        if (mcqIndex + 1 < mcqQuestions.length) {
            setMcqIndex(prev => prev + 1);
            setMcqSelected(null);
            setMcqSubmitted(false);
        } else {
            setStep('mcq_summary');
        }
    };

    // ── Evaluate the answer (non-MCQ) ────────────────────────────────
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

            // Fire-and-forget log for a completed non-MCQ evaluation
            fetch('/api/practice-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subjectValue,
                    level: levelValue,
                    topic: questionData?.topic || topic.trim(),
                    questionType: questionData?.questionType || questionType.toLowerCase().replace(' ', '_'),
                    difficulty: difficulty.toLowerCase(),
                    marks,
                    score: data.marksAwarded,
                    hasDiagram: !!questionData?.hasDiagram
                })
            }).catch(() => { });

            // Integrate with Daily Progress / Streak
            fetch('/api/scores/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paperId: `ai_practice_${Date.now()}`,
                    paperTitle: `AI Practice - ${questionData?.topic || topic.trim() || 'General'}`,
                    subject: subjectValue,
                    questionNumber: 'all',
                    score: data.marksAwarded,
                    maxMarks: marks
                })
            }).catch(() => { });
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
    // MCQ QUIZ MODE
    // ═══════════════════════════════════════════════════════════════════
    if (step === 'mcq_quiz') {
        const current = mcqQuestions[mcqIndex];
        const progressPct = ((mcqIndex + (mcqSubmitted ? 1 : 0)) / mcqQuestions.length) * 100;

        return (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                {/* Progress Bar + Counter */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <button onClick={() => { setStep('configure'); setMcqQuestions([]); }}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors font-medium text-sm">
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Exit Quiz
                        </button>
                        <span className="text-sm font-bold text-slate-400">
                            Question <span className="text-primary">{mcqIndex + 1}</span> of {mcqQuestions.length}
                        </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPct}%` }} />
                    </div>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                    <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary/30">
                        {subject}
                    </span>
                    <span className="bg-white/10 text-slate-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">
                        {level}
                    </span>
                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-amber-500/20">
                        MCQ
                    </span>
                    {current?.diagramUrl && (
                        <span className="bg-violet-500/10 text-violet-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-violet-500/20">
                            📊 Diagram
                        </span>
                    )}
                </div>

                {/* Question Card */}
                <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
                    <h3 className="text-lg font-bold text-slate-100 leading-relaxed">
                        {current?.question || 'Loading...'}
                    </h3>

                    {/* Diagram image if present */}
                    {current?.diagramUrl && (
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-white">
                            <img
                                src={current.diagramUrl}
                                alt="Question diagram"
                                className="w-full h-auto max-h-[400px] object-contain mx-auto"
                            />
                        </div>
                    )}

                    {/* Options A, B, C, D */}
                    <div className="space-y-3">
                        {current?.options && Object.entries(current.options).map(([letter, text]) => {
                            let optionStyle = 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20';

                            if (mcqSubmitted) {
                                if (letter === current.correct) {
                                    optionStyle = 'bg-green-500/15 border-green-500/40 text-green-300';
                                } else if (letter === mcqSelected && letter !== current.correct) {
                                    optionStyle = 'bg-red-500/15 border-red-500/40 text-red-300';
                                } else {
                                    optionStyle = 'bg-white/5 border-white/5 opacity-50';
                                }
                            } else if (mcqSelected === letter) {
                                optionStyle = 'bg-primary/15 border-primary/40 text-primary';
                            }

                            return (
                                <button
                                    key={letter}
                                    onClick={() => !mcqSubmitted && setMcqSelected(letter)}
                                    disabled={mcqSubmitted}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${optionStyle} ${!mcqSubmitted ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    <span className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 border ${mcqSubmitted && letter === current.correct ? 'bg-green-500/20 border-green-500/50 text-green-300' :
                                        mcqSubmitted && letter === mcqSelected && letter !== current.correct ? 'bg-red-500/20 border-red-500/50 text-red-300' :
                                            mcqSelected === letter && !mcqSubmitted ? 'bg-primary/20 border-primary/50 text-primary' :
                                                'bg-white/5 border-white/10 text-slate-400'
                                        }`}>
                                        {mcqSubmitted && letter === current.correct ? '✓' :
                                            mcqSubmitted && letter === mcqSelected && letter !== current.correct ? '✕' :
                                                letter}
                                    </span>
                                    <span className="text-sm font-medium text-slate-200">{text}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Submit / Feedback */}
                    {!mcqSubmitted ? (
                        <button
                            onClick={handleMcqSubmit}
                            disabled={!mcqSelected}
                            className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${mcqSelected
                                ? 'bg-primary hover:bg-primary/90 text-background-dark hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                                : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                                }`}>
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            Submit Answer
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {/* Correct / Wrong banner */}
                            <div className={`rounded-xl p-4 border ${mcqSelected === current.correct
                                ? 'bg-green-500/10 border-green-500/20'
                                : 'bg-red-500/10 border-red-500/20'
                                }`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-2xl ${mcqSelected === current.correct ? '' : ''}`}>
                                        {mcqSelected === current.correct ? '✅' : '❌'}
                                    </span>
                                    <span className={`font-black text-lg ${mcqSelected === current.correct ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {mcqSelected === current.correct ? 'Correct!' : 'Incorrect'}
                                    </span>
                                </div>
                                {mcqSelected !== current.correct && (
                                    <p className="text-sm text-slate-300 mb-1">
                                        You selected <span className="font-bold text-red-400">{mcqSelected}</span>, the correct answer is <span className="font-bold text-green-400">{current.correct}</span>.
                                    </p>
                                )}
                                <p className="text-sm text-slate-300 leading-relaxed mt-2">
                                    {current.explanation}
                                </p>
                            </div>

                            {/* Next / Finish button */}
                            <button
                                onClick={handleMcqNext}
                                className="w-full bg-primary hover:bg-primary/90 text-background-dark py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                                <span className="material-symbols-outlined text-base">
                                    {mcqIndex + 1 < mcqQuestions.length ? 'arrow_forward' : 'flag'}
                                </span>
                                {mcqIndex + 1 < mcqQuestions.length ? 'Next Question' : 'View Results'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // MCQ SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    if (step === 'mcq_summary') {
        const correctCount = mcqAnswers.filter(a => a.isCorrect).length;
        const totalCount = mcqAnswers.length;

        return (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                {/* Score Header */}
                <div className="glass rounded-3xl p-6 md:p-8 border border-white/5">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <ScoreRing awarded={correctCount} total={totalCount} />
                        <div className="text-center sm:text-left space-y-2">
                            <h2 className="text-2xl font-black text-slate-100">Quiz Complete!</h2>
                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                                <span className={`text-4xl font-black ${(correctCount / totalCount * 100) >= 70 ? 'text-green-400' :
                                    (correctCount / totalCount * 100) >= 40 ? 'text-amber-400' : 'text-red-400'
                                    }`}>
                                    {Math.round(correctCount / totalCount * 100)}%
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary/30">{subject}</span>
                                <span className="bg-white/10 text-slate-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">{topic}</span>
                                <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-amber-500/20">MCQ</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Per-question breakdown */}
                <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-100">Question Breakdown</h3>
                    <div className="space-y-3">
                        {mcqQuestions.map((q, i) => {
                            const ans = mcqAnswers[i];
                            return (
                                <div key={i} className={`rounded-xl p-4 border ${ans?.isCorrect ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${ans?.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {ans?.isCorrect ? '✓' : '✕'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 mb-1">Q{i + 1}. {q.question}</p>
                                            <p className="text-xs text-slate-400">
                                                Your answer: <span className={ans?.isCorrect ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{ans?.selected}</span>
                                                {!ans?.isCorrect && <> · Correct: <span className="text-green-400 font-bold">{ans?.correct}</span></>}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">{q.explanation}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => { setStep('configure'); setMcqQuestions([]); setMcqAnswers([]); setSavedSetId(null); }}
                        className="flex-1 bg-primary hover:bg-primary/90 text-background-dark py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                        <span className="material-symbols-outlined text-base">auto_awesome</span>
                        Try Another Quiz
                    </button>
                    <button onClick={() => handleSaveSet(true)} disabled={isSaving || savedSetId}
                        className={`px-6 py-3.5 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-2 ${(isSaving || savedSetId) ? 'border-primary/20 text-primary/50 bg-primary/5 cursor-not-allowed' : 'text-primary border-primary hover:bg-primary/10'}`}>
                        <span className="material-symbols-outlined text-base">{savedSetId ? 'bookmark_added' : 'bookmark_add'}</span>
                        {savedSetId ? 'Saved' : (isSaving ? 'Saving...' : 'Save Set')}
                    </button>
                    <button onClick={() => { setMcqIndex(0); setMcqSelected(null); setMcqSubmitted(false); setMcqAnswers([]); setStep('mcq_quiz'); setSavedSetId(null); }}
                        className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                        Retry Same Quiz
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: CONFIGURE
    // ═══════════════════════════════════════════════════════════════════
    if (step === 'configure') {
        const isMCQ = questionType === 'Multiple Choice';
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
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                {isMCQ ? 'Number of Questions' : 'Marks'}
                            </label>
                            <input type="number" value={marks} onChange={e => setMarks(parseInt(e.target.value) || 1)}
                                min={1} max={isMCQ ? 20 : 30}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 font-medium focus:outline-none focus:border-primary/50 transition-colors" />
                            {isMCQ && <p className="text-xs text-slate-500 mt-1">Each question = 1 mark with A, B, C, D options</p>}
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
                                {isMCQ ? `Generating ${marks} MCQs...` : 'Generating your question...'}
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">auto_awesome</span>
                                {isMCQ ? `Generate ${marks} MCQs ✨` : 'Generate Question ✨'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: QUESTION + ANSWER (non-MCQ)
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
                        {questionData?.hasDiagram && (
                            <span className="bg-violet-500/10 text-violet-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-violet-500/20">
                                📊 Diagram
                            </span>
                        )}
                    </div>

                    {/* Question text */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-100 mb-3">Question</h3>
                        {/* Diagram image if present */}
                        {questionData?.diagramUrl && (
                            <div className="rounded-xl overflow-hidden border border-white/10 bg-white mb-4">
                                <img
                                    src={questionData.diagramUrl}
                                    alt="Question diagram"
                                    className="w-full h-auto max-h-[400px] object-contain mx-auto"
                                />
                            </div>
                        )}
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
    // STEP 3: RESULTS (non-MCQ)
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
                <button onClick={() => { setStep('configure'); setQuestionData(null); setAnswer(''); setResults(null); setSavedSetId(null); }}
                    className="flex-1 bg-primary hover:bg-primary/90 text-background-dark py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    Try Another Question
                </button>
                <button onClick={() => handleSaveSet(false)} disabled={isSaving || savedSetId}
                    className={`px-6 py-3.5 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-2 ${(isSaving || savedSetId) ? 'border-primary/20 text-primary/50 bg-primary/5 cursor-not-allowed' : 'text-primary border-primary hover:bg-primary/10'}`}>
                    <span className="material-symbols-outlined text-base">{savedSetId ? 'bookmark_added' : 'bookmark_add'}</span>
                    {savedSetId ? 'Saved' : (isSaving ? 'Saving...' : 'Save Set')}
                </button>
                <button onClick={() => { setStep('question'); setResults(null); setAnswer(''); setSavedSetId(null); }}
                    className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                    Try Again
                </button>
            </div>
        </div>
    );
}
