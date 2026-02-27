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
        let correct = 0;
        paper.answers.forEach((ans, i) => { if (answers[i] === ans) correct++; });
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
                    maxMarks: paper.answers.length,
                }),
            }).catch(() => { });
        }
    }

    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    const timerStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>
            {/* Header */}
            <div style={{ flexShrink: 0, padding: '12px 25px', borderBottom: '2px solid var(--lime-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button onClick={onBack} style={{ background: '#eee', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 700 }}>← Exit</button>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-playfair)', color: 'var(--lime-dark)' }}>9708 Economics — MCQ</h3>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: submitted ? '#22c55e' : (timeLeft < 300 ? '#dc2626' : '#1e293b'), fontFamily: 'monospace' }}>
                    {submitted ? `✓ ${score}/${paper.answers.length}` : timerStr}
                </div>
            </div>

            {/* Split screen */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#f5f5f5' }}>
                {/* PDF */}
                <div style={{ flex: 6, height: '100%', borderRight: '1px solid #ddd' }}>
                    <iframe src={`/${paper.pdf}`} style={{ width: '100%', height: '100%', border: 'none' }} title="MCQ Paper" />
                </div>

                {/* Answer sheet */}
                <div style={{ flex: 4, height: '100%', overflowY: 'auto', padding: '20px', background: 'white' }}>
                    {submitted && score !== null && (
                        <div style={{ textAlign: 'center', padding: '20px', background: '#f0fdf4', border: '2px solid var(--lime-primary)', borderRadius: '12px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--lime-dark)' }}>{Math.round((score / paper.answers.length) * 100)}%</div>
                            <div style={{ fontSize: '1.3rem', color: '#333', fontWeight: 700 }}>Score: {score} / {paper.answers.length}</div>
                        </div>
                    )}

                    <h4 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--lime-dark)', borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0 }}>Answer Sheet</h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {paper.answers.map((correctAns, i) => {
                            const userAns = answers[i];
                            const isCorrect = userAns === correctAns;
                            return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '10px', borderRadius: '8px', border: submitted ? (isCorrect ? '2px solid #22c55e' : '2px solid #ef4444') : '1px solid #eee', background: '#fafafa' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ width: '40px', fontWeight: 700, color: '#555' }}>Q{i + 1}</div>
                                        <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'space-around' }}>
                                            {['A', 'B', 'C', 'D'].map(letter => {
                                                let bg = 'white', border = '2px solid #ccc', color = '#555';
                                                if (!submitted && userAns === letter) { bg = 'var(--lime-primary)'; border = '2px solid var(--lime-primary)'; color = 'white'; }
                                                if (submitted && letter === correctAns) { bg = '#22c55e'; border = '2px solid #22c55e'; color = 'white'; }
                                                if (submitted && userAns === letter && !isCorrect && letter !== correctAns) { bg = '#ef4444'; border = '2px solid #ef4444'; color = 'white'; }
                                                return (
                                                    <button key={letter} onClick={() => handleAnswer(i, letter)}
                                                        style={{ width: 40, height: 40, borderRadius: '50%', background: bg, border, color, fontWeight: 700, cursor: submitted ? 'default' : 'pointer', transition: '0.15s' }}>
                                                        {letter}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {submitted && !isCorrect && (
                                            <button
                                                onClick={() => getFeedback(i, correctAns, userAns)}
                                                style={{ marginLeft: '12px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 800, background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', width: '80px' }}
                                                disabled={loadingFeedbacks[i]}
                                            >
                                                {loadingFeedbacks[i] ? '...' : '✨ Why?'}
                                            </button>
                                        )}
                                    </div>
                                    {feedbacks[i] && (
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', lineHeight: '1.6', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#6366f1' }}>auto_awesome</span>
                                                AI Feedback
                                            </div>
                                            {feedbacks[i]}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {!submitted && (
                        <button onClick={() => handleSubmit()} style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginBottom: '40px' }}>
                            Submit & Grade Test
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
