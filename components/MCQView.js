'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function MCQView({ paperId, paperData, onBack }) {
    const paper = paperData[paperId];
    const { user } = useAuth();
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);
    const [timeLeft, setTimeLeft] = useState(75 * 60);
    const timerRef = useRef(null);

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

    function handleSubmit(auto = false) {
        if (submitted) return;
        if (!auto && !window.confirm('Are you ready to submit your answers for grading?')) return;
        clearInterval(timerRef.current);
        let correct = 0;
        paper.answers.forEach((ans, i) => { if (answers[i] === ans) correct++; });
        setScore(correct);
        setSubmitted(true);
        // Silently save to MongoDB
        if (user) {
            fetch('/api/scores/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user,
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
                                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px', borderRadius: '8px', border: submitted ? (isCorrect ? '2px solid #22c55e' : '2px solid #ef4444') : '1px solid #eee', background: '#fafafa' }}>
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
