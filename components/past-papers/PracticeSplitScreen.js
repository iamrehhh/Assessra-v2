'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PracticeSplitScreen({ paperId }) {
    const router = useRouter();
    const filename = decodeURIComponent(paperId);

    // UI state
    const [pdfUrl, setPdfUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [showInsert, setShowInsert] = useState(false);
    const [insertFilename, setInsertFilename] = useState(null);

    // Workspace state
    // Blocks represent the questions the student is answering: { id, label, questionText, marks, answer, status, feedback }
    const [blocks, setBlocks] = useState([
        { id: '1', label: 'Q1', questionText: '', marks: 0, answer: '', status: 'idle', feedback: null }
    ]);
    const [extracting, setExtracting] = useState(false);

    useEffect(() => {
        // Fetch metadata to see if there's an insert associated, and get the exact URL
        const init = async () => {
            // Fetch paper info (urls and possible insert filename) using our backend API
            try {
                const res = await fetch(`/api/past-papers/info?filename=${filename}`);
                const data = await res.json();

                if (res.ok) {
                    setPdfUrl(data.pdfUrl || '');
                    if (data.insertFilename) {
                        setInsertFilename(data.insertFilename);
                    }
                } else {
                    console.error('Failed to get paper info:', data.error);
                }
            } catch (e) {
                console.error('Error fetching paper info:', e);
            }

            setLoading(false);
        };
        init();
    }, [filename]);

    const addBlock = () => {
        const nextNum = blocks.length + 1;
        setBlocks([...blocks, { id: Date.now().toString(), label: `Q${nextNum}`, questionText: '', marks: 0, answer: '', status: 'idle', feedback: null }]);
    };

    const extractQuestions = async () => {
        setExtracting(true);
        try {
            const res = await fetch('/api/past-papers/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();

            if (res.ok && data.questions && data.questions.length > 0) {
                const newBlocks = data.questions.map((q, idx) => ({
                    id: Date.now().toString() + idx,
                    label: q.label,
                    questionText: q.text,
                    marks: q.marks,
                    answer: '',
                    status: 'idle',
                    feedback: null
                }));
                // Replace or append? Let's replace the default empty one if nothing was typed there.
                if (blocks.length === 1 && !blocks[0].answer && !blocks[0].questionText) {
                    setBlocks(newBlocks);
                } else {
                    setBlocks([...blocks, ...newBlocks]);
                }
            } else {
                alert(data.error || 'No questions could be extracted from this paper automatically.');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to connect to extraction service.');
        } finally {
            setExtracting(false);
        }
    };

    const updateBlock = (id, field, value) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const removeBlock = (id) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const handleSubmit = async (id) => {
        const block = blocks.find(b => b.id === id);
        if (!block || !block.answer.trim()) return;

        updateBlock(id, 'status', 'evaluating');

        try {
            // First we need the subject, level, year to query the correct markscheme
            const { data: docData } = await supabase.from('document_chunks')
                .select('subject, level, year')
                .eq('filename', filename)
                .limit(1);

            const meta = docData?.[0] || {};

            // Call the evaluation endpoint (which handles RAG for the markscheme)
            const res = await fetch('/api/ai/grade-past-paper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: meta.subject,
                    level: meta.level,
                    year: meta.year,
                    questionLabel: block.label,
                    questionText: block.questionText,
                    totalMarks: block.marks,
                    studentAnswer: block.answer
                })
            });

            const resultData = await res.json();
            if (!res.ok) throw new Error(resultData.error || 'Evaluation failed');

            updateBlock(id, 'feedback', resultData);
            updateBlock(id, 'status', 'done');
        } catch (err) {
            console.error('Submit error:', err);
            updateBlock(id, 'status', 'idle');
            alert('Error evaluating answer: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-dark text-slate-100">
                <div className="w-8 h-8 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background-dark text-slate-100 font-display overflow-hidden">
            {/* Split Container */}
            <div className="flex w-full h-full pb-0 pt-0">

                {/* Left Panel: PDF Viewer */}
                <div className="w-1/2 h-full flex flex-col border-r border-white/10 bg-[#1e1e1e]">
                    {/* Header */}
                    <div className="h-14 bg-background-dark border-b border-white/10 flex items-center justify-between px-4 shrink-0">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold">
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Exit
                        </button>

                        {insertFilename && (
                            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                <button
                                    onClick={() => setShowInsert(false)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${!showInsert ? 'bg-primary text-background-dark shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Paper
                                </button>
                                <button
                                    onClick={() => setShowInsert(true)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${showInsert ? 'bg-primary text-background-dark shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Insert
                                </button>
                            </div>
                        )}
                        <div className="w-16"></div> {/* Spacer to center toggle */}
                    </div>

                    {/* Iframe Viewer */}
                    <div className="flex-1 w-full bg-[#323639]">
                        <iframe
                            src={showInsert && insertFilename ? pdfUrl.replace(filename, insertFilename) : pdfUrl}
                            className="w-full h-full border-none"
                            title="PDF Viewer"
                        />
                    </div>
                </div>

                {/* Right Panel: Workspace */}
                <div className="w-1/2 h-full flex flex-col overflow-y-auto bg-background-dark relative">
                    <div className="h-14 border-b border-white-10 sticky top-0 bg-background-dark/80 backdrop-blur-md z-10 flex items-center px-6 shrink-0 shrink-0">
                        <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                            <span className="text-primary material-symbols-outlined text-xl">edit_square</span>
                            Practice Workspace
                        </h2>
                    </div>

                    <div className="p-6 md:p-8 space-y-8 pb-32">
                        {/* Auto-Extract Banner */}
                        {blocks.length === 1 && !blocks[0].questionText && !blocks[0].answer && (
                            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                                <span className="material-symbols-outlined text-primary text-4xl">auto_awesome</span>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-100">AI Question Extractor</h3>
                                    <p className="text-slate-400 text-sm mt-1 max-w-sm">Automatically scan this specific past paper and pull out all questions, labels, and marks into your workspace.</p>
                                </div>
                                <button
                                    onClick={extractQuestions}
                                    disabled={extracting}
                                    className="mt-2 bg-primary text-background-dark font-bold px-6 py-2.5 rounded-xl hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all flex items-center gap-2"
                                >
                                    {extracting ? (
                                        <><div className="w-4 h-4 border-2 border-background-dark border-t-transparent rounded-full animate-spin"></div> Extracting...</>
                                    ) : (
                                        <><span className="material-symbols-outlined text-sm">smart_toy</span> Extract Questions</>
                                    )}
                                </button>
                            </div>
                        )}

                        {blocks.map((block, index) => (
                            <div key={block.id} className="relative bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 pr-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <input
                                                type="text"
                                                value={block.label}
                                                onChange={(e) => updateBlock(block.id, 'label', e.target.value)}
                                                className="bg-transparent text-lg font-black text-slate-100 placeholder-slate-600 focus:outline-none focus:border-b border-primary/50 w-24"
                                                placeholder="e.g. Q1a"
                                            />
                                            <div className="flex items-center bg-primary rounded-full px-3 py-0.5 border border-primary/20">
                                                <input
                                                    type="number"
                                                    value={block.marks || ''}
                                                    onChange={(e) => updateBlock(block.id, 'marks', parseInt(e.target.value) || 0)}
                                                    className="bg-transparent text-xs font-bold text-background-dark text-center focus:outline-none w-6"
                                                    placeholder="0"
                                                />
                                                <span className="text-xs font-bold text-background-dark pr-1">Marks</span>
                                            </div>
                                        </div>
                                        <textarea
                                            value={block.questionText}
                                            onChange={(e) => updateBlock(block.id, 'questionText', e.target.value)}
                                            rows={2}
                                            placeholder="Paste or type the question text here..."
                                            className="w-full bg-transparent text-slate-100 font-bold placeholder-slate-500 focus:outline-none resize-y min-h-[50px] leading-relaxed"
                                        />
                                    </div>

                                    {blocks.length > 1 && (
                                        <button onClick={() => removeBlock(block.id)} className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    )}
                                </div>

                                <textarea
                                    value={block.answer}
                                    onChange={(e) => updateBlock(block.id, 'answer', e.target.value)}
                                    rows={8}
                                    placeholder={`Type your answer for ${block.label} here...`}
                                    className="w-full bg-background-dark/50 border border-white/10 rounded-2xl px-5 py-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors resize-y min-h-[200px]"
                                    disabled={block.status === 'evaluating' || block.status === 'done'}
                                />

                                <div className="flex gap-3">
                                    {block.status !== 'done' && (
                                        <div className="flex-1 flex flex-col gap-2">
                                            <button
                                                onClick={() => handleSubmit(block.id)}
                                                disabled={block.status === 'evaluating' || !block.answer.trim()}
                                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all ${block.status === 'evaluating' || !block.answer.trim()
                                                    ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                                    : 'bg-primary text-background-dark shadow-[0_4px_14px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_20px_rgba(34,197,94,0.4)] hover:-translate-y-0.5'
                                                    }`}
                                            >
                                                {block.status === 'evaluating' ? (
                                                    <><div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /> Strict Marking...</>
                                                ) : (
                                                    <><span className="material-symbols-outlined text-base">fact_check</span> Submit for Strict Marking</>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {block.status === 'done' && block.feedback && (
                                        <button
                                            onClick={() => {
                                                // Dispatch an event or state to open a modal. For now, we'll keep it inline or show a modal component state if added.
                                                // Actually the design calls for a popup modal. Let's add a state for active feedback modal.
                                                window.dispatchEvent(new CustomEvent('open-feedback-modal', { detail: block }));
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold border border-primary text-primary hover:bg-primary/10 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-base">bar_chart</span>
                                            View AI Feedback
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addBlock}
                            className="w-full py-4 rounded-3xl border-2 border-dashed border-white/10 text-slate-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold mb-12"
                        >
                            <span className="material-symbols-outlined">add</span>
                            Add Empty Answer Block
                        </button>
                    </div>
                </div>
            </div>

            <FeedbackModal />
        </div>
    );
}

// ── AI Feedback Modal ──────────────────────────────────────────
function FeedbackModal() {
    const [block, setBlock] = useState(null);

    useEffect(() => {
        const handleOpen = (e) => setBlock(e.detail);
        window.addEventListener('open-feedback-modal', handleOpen);
        return () => window.removeEventListener('open-feedback-modal', handleOpen);
    }, []);

    if (!block || !block.feedback) return null;

    const { feedback } = block;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#1e293b] w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 animate-slide-up">

                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/5">
                    <div>
                        <h2 className="text-xl font-black text-slate-100">{block.label} Feedback</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/20">
                                Score: {feedback.score}
                            </span>
                        </div>
                    </div>
                    <button onClick={() => setBlock(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Mark Breakdown */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">fact_check</span> Requirements Met
                        </h3>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {feedback.breakdown || "No breakdown provided."}
                        </div>
                    </div>

                    {/* Examiner Feedback */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">campaign</span> Examiner Feedback
                        </h3>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-200/90 text-sm whitespace-pre-wrap leading-relaxed">
                            {feedback.feedback || "No feedback provided."}
                        </div>
                    </div>

                    {/* Model Answer */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">workspace_premium</span> Model Answer
                        </h3>
                        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                            {feedback.modelAnswer || "No model answer provided."}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
