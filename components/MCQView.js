'use client';

import { useState, useEffect, useRef } from 'react';
import { useConfirm } from '@/components/ConfirmContext';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';

const ANSWERS_KEY = (id) => `mcq_answers_${id}`;

export default function MCQView({ paperId, paperData, onBack }) {
    const confirmDialog = useConfirm();
    const paper = paperData[paperId];
    const { data: session, status: sessionStatus } = useSession();

    // Load saved answers from localStorage (for UI highlighting)
    const savedAnswers = (() => {
        if (typeof window === 'undefined') return {};
        try {
            const raw = localStorage.getItem(ANSWERS_KEY(paperId));
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    })();

    const [answers, setAnswers] = useState(savedAnswers);
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);
    const [timeLeft, setTimeLeft] = useState(75 * 60);
    const [feedbacks, setFeedbacks] = useState({});
    const [loadingFeedbacks, setLoadingFeedbacks] = useState({});
    const [loadingAttempt, setLoadingAttempt] = useState(true);
    const timerRef = useRef(null);

    // On mount: check Supabase for existing attempt
    useEffect(() => {
        if (sessionStatus !== 'authenticated' || !session?.user?.email) {
            setLoadingAttempt(false);
            return;
        }
        fetch(`/api/mcq-attempts?paperId=${encodeURIComponent(paperId)}`)
            .then(r => r.json())
            .then(data => {
                if (data.found) {
                    // Restore user answers: prefer Supabase, fallback to localStorage
                    if (data.userAnswers && typeof data.userAnswers === 'object') {
                        setAnswers(data.userAnswers);
                    }
                    setSubmitted(true);
                    setScore(data.score);
                    setTimeLeft(0);
                    clearInterval(timerRef.current);
                }
            })
            .catch(err => console.error('Failed to load MCQ attempt:', err))
            .finally(() => setLoadingAttempt(false));
    }, [paperId, sessionStatus]);

    const getFeedback = async (qIdx, correctAnswer, userAnswer, questionNumber, questionText) => {
        if (loadingFeedbacks[qIdx] || feedbacks[qIdx]) return;
        setLoadingFeedbacks(prev => ({ ...prev, [qIdx]: true }));
        try {
            const res = await fetch('/api/mcq-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfPath: paper.pdf,
                    questionNumber: questionNumber,
                    userAnswer: userAnswer || 'None left blank',
                    correctAnswer: correctAnswer || null,
                    questionText: questionText || null
                })
            });
            const data = await res.json();
            if (data.feedback) {
                setFeedbacks(prev => ({ ...prev, [qIdx]: data.feedback }));
            } else if (data.error) {
                alert(`AI Explanation Error: ${data.error}`);
            } else {
                alert('AI Explanation failed to load. Please try again.');
            }
        } catch (e) {
            console.error('Error fetching feedback', e);
            alert('Failed to connect to the server. Please try again or check your internet connection.');
        }
        setLoadingFeedbacks(prev => ({ ...prev, [qIdx]: false }));
    };

    useEffect(() => {
        if (loadingAttempt || submitted) { clearInterval(timerRef.current); return; }
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [submitted, loadingAttempt]);

    if (loadingAttempt) return (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>
            <div className="w-8 h-8 border-4 border-border-main border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p>Loading your attempt...</p>
        </div>
    );

    if (!paper) return (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>
            <p>Paper not found.</p>
            <button onClick={onBack} style={{ padding: '10px 30px', borderRadius: '8px', border: 'none', background: 'var(--lime-primary)', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Go Back</button>
        </div>
    );

    function handleAnswer(qIdx, letter) {
        if (submitted) return;
        setAnswers(prev => ({ ...prev, [qIdx]: letter }));
    }

    const handleSubmit = async (auto = false) => {
        if (submitted) return;
        if (!auto) {
            const isConfirmed = await confirmDialog('Submit Answers', 'Are you ready to submit your answers for grading?');
            if (!isConfirmed) return;
        }
        clearInterval(timerRef.current);
        const ansList = paper.answers || [];
        const totalQ = ansList.length || (paper.questions ? paper.questions.length : 0);
        let correct = null;
        if (ansList.length > 0) {
            correct = 0;
            ansList.forEach((ans, i) => { if (answers[i] === ans) correct++; });
            setScore(correct);
        }
        setSubmitted(true);
        // Save answers to localStorage for UI highlighting on reload
        try { localStorage.setItem(ANSWERS_KEY(paperId), JSON.stringify(answers)); } catch { }
        // Save score and user answers to Supabase
        if (session?.user?.email) {
            fetch('/api/scores/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: session.user.email,
                    paperId,
                    paperTitle: `Economics MCQ — ${paperId}`,
                    subject: 'economics-p3',
                    questionNumber: 'all',
                    score: correct !== null ? correct : 0,
                    maxMarks: Math.max(1, totalQ),
                    userAnswers: answers,
                }),
            }).then(res => {
                if (!res.ok) console.error('Score save failed:', res.status);
            }).catch(err => console.error('Score save error:', err));
        }
    }

    const handleReset = async () => {
        const isConfirmed = await confirmDialog('Reset Attempt', 'Are you sure you want to reset? Your current score and answers will be erased and you can re-attempt this paper.');
        if (!isConfirmed) return;
        // Clear localStorage
        try { localStorage.removeItem(ANSWERS_KEY(paperId)); } catch { }
        // Delete from Supabase
        try {
            await fetch(`/api/mcq-attempts?paperId=${encodeURIComponent(paperId)}`, { method: 'DELETE' });
        } catch (err) { console.error('Failed to delete attempt:', err); }
        // Reset all state
        setAnswers({});
        setSubmitted(false);
        setScore(null);
        setFeedbacks({});
        setLoadingFeedbacks({});
        setTimeLeft(75 * 60);
    };

    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    const timerStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    return (
        <div className="flex flex-col h-screen bg-bg-base text-text-main font-display overflow-hidden fixed inset-0 z-[9999]">
            {/* Top Header */}
            <div className="h-14 bg-bg-base border-b border-border-main flex items-center justify-between px-6 shrink-0 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors text-sm font-bold bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-border-main hover:bg-black/10 dark:bg-white/10 cursor-pointer">
                        <span className="material-symbols-outlined text-base">arrow_back</span> Exit
                    </button>
                    <h3 className="m-0 font-bold text-primary text-lg font-display">{paper.title || 'Economics P3 — MCQ'}</h3>
                </div>
                <div className={`flex items-center gap-2 text-xl font-bold font-mono ${submitted ? 'text-green-500' : (timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-text-main')}`}>
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {submitted ? (paper.answers && paper.answers.length > 0 ? `✓ ${score}/${paper.answers.length}` : '✓ Finished') : timerStr}
                </div>
            </div>

            {/* Split Container */}
            <div className="flex flex-1 overflow-hidden bg-bg-base">
                {/* Left Panel: PDF Viewer */}
                <div className="flex-[5.5] h-full border-r border-border-main bg-[#323639]">
                    <iframe
                        src={encodeURI(`/${paper.pdf}#toolbar=0&navpanes=0&scrollbar=0`)}
                        className="w-full h-full border-none"
                        title="PDF Viewer"
                    />
                </div>

                {/* Right Panel: Answer Sheet */}
                <div className="flex-[4.5] h-full overflow-y-auto p-6 bg-bg-card dark:bg-[#1e1e1e]">
                    {submitted && score !== null && (
                        <div className="text-center p-6 bg-green-500/10 border border-green-500/30 rounded-2xl mb-8">
                            <div className="text-4xl font-black text-green-400 mb-1">{Math.round((score / Math.max(1, (paper.answers || []).length)) * 100)}%</div>
                            <div className="text-lg text-text-muted font-bold">Score: {score} / {(paper.answers || []).length}</div>
                            <button
                                onClick={handleReset}
                                className="mt-4 px-5 py-2 text-sm font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-xl transition-colors hover:bg-orange-500/20 cursor-pointer flex items-center gap-2 mx-auto"
                            >
                                <span className="material-symbols-outlined text-base">restart_alt</span>
                                Reset & Re-attempt
                            </button>
                        </div>
                    )}
                    {submitted && (!paper.answers || paper.answers.length === 0) && (
                        <div className="text-center p-6 bg-purple-500/10 border border-purple-500/30 rounded-2xl mb-8">
                            <div className="text-2xl font-black text-purple-400 mb-2">Practice Submitted</div>
                            <div className="text-sm font-bold text-purple-400/80">No official marking scheme is available for this paper.<br />Use the AI Solution buttons below to verify your answers!</div>
                            <button
                                onClick={handleReset}
                                className="mt-4 px-5 py-2 text-sm font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-xl transition-colors hover:bg-orange-500/20 cursor-pointer flex items-center gap-2 mx-auto"
                            >
                                <span className="material-symbols-outlined text-base">restart_alt</span>
                                Reset & Re-attempt
                            </button>
                        </div>
                    )}

                    <h4 className="font-bold text-text-main border-b border-border-main pb-3 mt-0 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined">checklist</span> Answer Sheet
                    </h4>

                    <div className="flex flex-col gap-3">
                        {(() => {
                            const items = paper.questions || (paper.answers ? paper.answers.map((_, idx) => ({ n: idx + 1, t: null })) : []);
                            const ansList = paper.answers || [];

                            return items.map((qItem, i) => {
                                const correctAns = ansList[i];
                                const userAns = answers[i];
                                const isCorrect = correctAns ? userAns === correctAns : false;
                                return (
                                    <div key={i} className={`flex flex-col p-4 rounded-xl border ${submitted && correctAns ? (isCorrect ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5') : 'border-border-main bg-black/5 dark:bg-white/5'}`}>
                                        {qItem.t && (
                                            <div className="text-text-main mb-3 text-sm leading-relaxed border-b border-border-main pb-3">
                                                <span className="font-bold text-primary mr-2">Q{qItem.n || i + 1}.</span>
                                                {qItem.t}
                                            </div>
                                        )}
                                        <div className="flex items-center">
                                            {!qItem.t && <div className="w-10 font-bold text-text-muted">Q{i + 1}</div>}
                                            <div className="flex gap-2 flex-1 justify-around">
                                                {['A', 'B', 'C', 'D'].map(letter => {
                                                    let bg = 'bg-black/5 dark:bg-white/5', border = 'border-border-main', color = 'text-text-muted';
                                                    let hover = 'hover:border-primary/50 hover:bg-black/10 dark:bg-white/10';
                                                    if (!submitted && userAns === letter) { bg = 'bg-primary'; border = 'border-primary'; color = 'text-background-dark'; hover = ''; }
                                                    if (submitted && correctAns && letter === correctAns) { bg = 'bg-green-500'; border = 'border-green-500'; color = 'text-white'; hover = ''; }
                                                    if (submitted && correctAns && userAns === letter && !isCorrect && letter !== correctAns) { bg = 'bg-red-500'; border = 'border-red-500'; color = 'text-white'; hover = ''; }
                                                    if (submitted && !correctAns && userAns === letter) { bg = 'bg-primary/50'; border = 'border-primary/50'; color = 'text-white'; hover = ''; } // Just show selection if no answer key
                                                    return (
                                                        <button key={letter} onClick={() => handleAnswer(i, letter)}
                                                            className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} border ${border} ${color} font-bold transition-all ${submitted ? 'cursor-default' : `cursor-pointer ${hover}`}`}>
                                                            {letter}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {submitted && (
                                                <button
                                                    onClick={() => getFeedback(i, correctAns, userAns, qItem.n || i + 1, qItem.t || null)}
                                                    className="ml-3 px-3 py-1.5 text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg transition-colors hover:bg-purple-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 whitespace-nowrap"
                                                    disabled={loadingFeedbacks[i]}
                                                >
                                                    {loadingFeedbacks[i] ? <span className="material-symbols-outlined text-sm animate-spin">refresh</span> : (correctAns && isCorrect ? '✨ AI Explanation' : (correctAns ? '✨ Why?' : '✨ AI Solution'))}
                                                </button>
                                            )}
                                        </div>
                                        {feedbacks[i] && (
                                            <div className="mt-4 p-4 bg-bg-base/50 rounded-xl text-sm text-text-muted leading-relaxed border border-border-main">
                                                <div className="font-bold text-text-main mb-2 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[16px] text-purple-400">auto_awesome</span>
                                                    AI Feedback
                                                </div>
                                                <div className="ai-feedback-content">
                                                    <ReactMarkdown>{feedbacks[i]}</ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    {!submitted && (
                        <button onClick={() => handleSubmit()} className="mt-8 w-full p-4 bg-primary hover:bg-primary/90 text-background-dark border-none rounded-xl font-black text-base cursor-pointer transition-colors shadow-lg shadow-primary/20 mb-10 flex justify-center items-center gap-2">
                            <span className="material-symbols-outlined">send</span> Submit & Grade Test
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
