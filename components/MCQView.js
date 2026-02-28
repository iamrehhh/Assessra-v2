'use client';

import { useState, useEffect, useRef } from 'react';
import { useConfirm } from '@/components/ConfirmContext';
import { useSession } from 'next-auth/react';

export default function MCQView({ paperId, paperData, onBack }) {
    const confirmDialog = useConfirm();
    const paper = paperData[paperId];
    const { data: session } = useSession();
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);
    const [timeLeft, setTimeLeft] = useState(75 * 60);
    const [feedbacks, setFeedbacks] = useState({});
    const [loadingFeedbacks, setLoadingFeedbacks] = useState({});
    const timerRef = useRef(null);

    const getFeedback = async (qIdx, correctAnswer, userAnswer) => {
        if (loadingFeedbacks[qIdx] || feedbacks[qIdx]) return;
        setLoadingFeedbacks(prev => ({ ...prev, [qIdx]: true }));
        try {
            const res = await fetch('/api/mcq-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfPath: paper.pdf,
                    questionNumber: qIdx + 1,
                    userAnswer: userAnswer || 'None left blank',
                    correctAnswer
                })
            });
            const data = await res.json();
            if (data.feedback) {
                setFeedbacks(prev => ({ ...prev, [qIdx]: data.feedback }));
            }
        } catch (e) { console.error('Error fetching feedback', e); }
        setLoadingFeedbacks(prev => ({ ...prev, [qIdx]: false }));
    };

    useEffect(() => {
        if (submitted) { clearInterval(timerRef.current); return; }
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [submitted]);

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
        let correct = 0;
        if (ansList.length > 0) {
            ansList.forEach((ans, i) => { if (answers[i] === ans) correct++; });
        }
        setScore(correct);
        setSubmitted(true);
        // Silently save to MongoDB
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
                    score: correct,
                    maxMarks: Math.max(1, totalQ),
                }),
            }).catch(() => { });
        }
    }

    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    const timerStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    return (
        <div className="flex flex-col h-screen bg-background-dark text-slate-100 font-display overflow-hidden fixed inset-0 z-[9999]">
            {/* Top Header */}
            <div className="h-14 bg-background-dark border-b border-white/10 flex items-center justify-between px-6 shrink-0 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer">
                        <span className="material-symbols-outlined text-base">arrow_back</span> Exit
                    </button>
                    <h3 className="m-0 font-bold text-primary text-lg font-display">{paper.title || 'Economics P3 — MCQ'}</h3>
                </div>
                <div className={`flex items-center gap-2 text-xl font-bold font-mono ${submitted ? 'text-green-500' : (timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-200')}`}>
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {submitted ? `✓ ${score}/${(paper.answers || paper.questions || []).length}` : timerStr}
                </div>
            </div>

            {/* Split Container */}
            <div className="flex flex-1 overflow-hidden bg-background-dark">
                {/* Left Panel: PDF Viewer */}
                <div className="flex-[5.5] h-full border-r border-white/10 bg-[#323639]">
                    <iframe
                        src={encodeURI(`/${paper.pdf}#toolbar=0&navpanes=0&scrollbar=0`)}
                        className="w-full h-full border-none"
                        title="PDF Viewer"
                    />
                </div>

                {/* Right Panel: Answer Sheet */}
                <div className="flex-[4.5] h-full overflow-y-auto p-6 bg-[#1e1e1e]">
                    {submitted && score !== null && (
                        <div className="text-center p-6 bg-green-500/10 border border-green-500/30 rounded-2xl mb-8">
                            <div className="text-4xl font-black text-green-400 mb-1">{Math.round((score / Math.max(1, (paper.answers || paper.questions || []).length)) * 100)}%</div>
                            <div className="text-lg text-slate-300 font-bold">Score: {score} / {(paper.answers || paper.questions || []).length}</div>
                        </div>
                    )}

                    <h4 className="font-bold text-slate-200 border-b border-white/10 pb-3 mt-0 mb-4 flex items-center gap-2">
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
                                    <div key={i} className={`flex flex-col p-4 rounded-xl border ${submitted && correctAns ? (isCorrect ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5') : 'border-white/10 bg-white/5'}`}>
                                        {qItem.t && (
                                            <div className="text-slate-200 mb-3 text-sm leading-relaxed border-b border-white/5 pb-3">
                                                <span className="font-bold text-primary mr-2">Q{qItem.n || i + 1}.</span>
                                                {qItem.t}
                                            </div>
                                        )}
                                        <div className="flex items-center">
                                            {!qItem.t && <div className="w-10 font-bold text-slate-400">Q{i + 1}</div>}
                                            <div className="flex gap-2 flex-1 justify-around">
                                                {['A', 'B', 'C', 'D'].map(letter => {
                                                    let bg = 'bg-white/5', border = 'border-white/10', color = 'text-slate-300';
                                                    let hover = 'hover:border-primary/50 hover:bg-white/10';
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
                                            {submitted && !isCorrect && correctAns && (
                                                <button
                                                    onClick={() => getFeedback(i, correctAns, userAns)}
                                                    className="ml-3 px-3 py-1.5 text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg transition-colors hover:bg-purple-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 w-20"
                                                    disabled={loadingFeedbacks[i]}
                                                >
                                                    {loadingFeedbacks[i] ? <span className="material-symbols-outlined text-sm animate-spin">refresh</span> : '✨ Why?'}
                                                </button>
                                            )}
                                        </div>
                                        {feedbacks[i] && (
                                            <div className="mt-4 p-4 bg-background-dark/50 rounded-xl text-sm text-slate-300 leading-relaxed border border-white/5">
                                                <div className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[16px] text-purple-400">auto_awesome</span>
                                                    AI Feedback
                                                </div>
                                                {feedbacks[i]}
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
