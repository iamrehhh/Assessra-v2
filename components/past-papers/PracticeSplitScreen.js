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
    // Blocks represent the questions the student is answering: { id, label, answer, status, feedback }
    const [blocks, setBlocks] = useState([
        { id: '1', label: 'Question 1', answer: '', status: 'idle', feedback: null }
    ]);

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
        setBlocks([...blocks, { id: Date.now().toString(), label: `Question ${nextNum}`, answer: '', status: 'idle', feedback: null }]);
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
                        {blocks.map((block, index) => (
                            <div key={block.id} className="glass rounded-3xl p-6 border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <input
                                        type="text"
                                        value={block.label}
                                        onChange={(e) => updateBlock(block.id, 'label', e.target.value)}
                                        className="bg-transparent text-lg font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-b border-primary/50 w-1/2"
                                        placeholder="e.g. Question 1(a)"
                                    />
                                    {blocks.length > 1 && (
                                        <button onClick={() => removeBlock(block.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    )}
                                </div>

                                <textarea
                                    value={block.answer}
                                    onChange={(e) => updateBlock(block.id, 'answer', e.target.value)}
                                    rows={6}
                                    placeholder={`Type your answer for ${block.label} here...`}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors resize-y min-h-[150px]"
                                    disabled={block.status === 'evaluating' || block.status === 'done'}
                                />

                                <div className="flex gap-3">
                                    {block.status !== 'done' && (
                                        <button
                                            onClick={() => handleSubmit(block.id)}
                                            disabled={block.status === 'evaluating' || !block.answer.trim()}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${block.status === 'evaluating' || !block.answer.trim()
                                                ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                                : 'bg-primary text-background-dark hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                                                }`}
                                        >
                                            {block.status === 'evaluating' ? (
                                                <><div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /> Evaluating...</>
                                            ) : (
                                                <><span className="material-symbols-outlined text-base">check_circle</span> Submit Answer</>
                                            )}
                                        </button>
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
                            className="w-full py-4 rounded-3xl border-2 border-dashed border-white/10 text-slate-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold"
                        >
                            <span className="material-symbols-outlined">add</span>
                            Add Answer Block
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
