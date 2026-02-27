'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const CATEGORIES = [
    { value: 'bug', label: 'Bug / Crash', icon: 'bug_report' },
    { value: 'wrong_answer', label: 'Wrong AI Answer', icon: 'error' },
    { value: 'missing_content', label: 'Missing Content', icon: 'help' },
    { value: 'ui_issue', label: 'UI / Design Issue', icon: 'palette' },
    { value: 'other', label: 'Other', icon: 'more_horiz' },
];

const STATUS_COLORS = {
    open: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20', label: 'Open' },
    in_progress: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20', label: 'In Progress' },
    resolved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Resolved' },
};

export default function ReportErrorModal({ currentView }) {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('new'); // 'new' or 'history'

    // Form state
    const [category, setCategory] = useState('bug');
    const [page, setPage] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // History state
    const [myReports, setMyReports] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [hasUnreadReply, setHasUnreadReply] = useState(false);

    // Listen for open event
    useEffect(() => {
        const handleOpen = () => setOpen(true);
        window.addEventListener('open-report-modal', handleOpen);
        return () => window.removeEventListener('open-report-modal', handleOpen);
    }, []);

    // Auto-populate page when opening
    useEffect(() => {
        if (open) {
            setPage(currentView || 'home');
            setSubmitted(false);
            fetchMyReports();
        }
    }, [open, currentView]);

    // Check for unread replies periodically
    useEffect(() => {
        const checkReplies = async () => {
            try {
                const res = await fetch('/api/reports?mine=true');
                if (res.ok) {
                    const data = await res.json();
                    const seen = JSON.parse(localStorage.getItem('assessra_seen_replies') || '[]');
                    const hasNew = (data.reports || []).some(r => r.admin_reply && !seen.includes(r.id));
                    setHasUnreadReply(hasNew);
                }
            } catch (e) { /* silent */ }
        };
        checkReplies();
        const interval = setInterval(checkReplies, 60000); // check every minute
        return () => clearInterval(interval);
    }, []);

    const fetchMyReports = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch('/api/reports?mine=true');
            if (res.ok) {
                const data = await res.json();
                setMyReports(data.reports || []);
                // Mark replied ones as seen
                const seen = JSON.parse(localStorage.getItem('assessra_seen_replies') || '[]');
                const newSeen = [...new Set([...seen, ...(data.reports || []).filter(r => r.admin_reply).map(r => r.id)])];
                localStorage.setItem('assessra_seen_replies', JSON.stringify(newSeen));
                setHasUnreadReply(false);
            }
        } catch (e) { console.error('Failed to fetch reports', e); }
        setLoadingHistory(false);
    };

    const handleSubmit = async () => {
        if (!description.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, page, description }),
            });
            if (res.ok) {
                setSubmitted(true);
                setDescription('');
                setCategory('bug');
                fetchMyReports();
            }
        } catch (e) {
            console.error('Report submit error', e);
            alert('Failed to submit report. Please try again.');
        }
        setSubmitting(false);
    };

    const close = () => {
        setOpen(false);
        setTab('new');
        setSubmitted(false);
    };

    if (!open) {
        // Expose unread badge state via custom event
        if (typeof window !== 'undefined') {
            window.__reportHasUnread = hasUnreadReply;
        }
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={close}>
            <div
                className="bg-[#0f172a] w-full max-w-lg max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10"
                style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center border border-red-500/20">
                            <span className="material-symbols-outlined text-red-400 text-lg">bug_report</span>
                        </div>
                        <h2 className="text-lg font-black text-slate-100">Report an Issue</h2>
                    </div>
                    <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="px-6 pt-4 flex gap-1 bg-white/[0.02]">
                    <button
                        onClick={() => setTab('new')}
                        className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all ${tab === 'new' ? 'bg-white/10 text-white border-b-2 border-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        New Report
                    </button>
                    <button
                        onClick={() => { setTab('history'); fetchMyReports(); }}
                        className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${tab === 'history' ? 'bg-white/10 text-white border-b-2 border-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        My Reports
                        {myReports.length > 0 && (
                            <span className="bg-white/10 text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{myReports.length}</span>
                        )}
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {tab === 'new' ? (
                        submitted ? (
                            /* Success State */
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                                    <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-100">Report Submitted!</h3>
                                <p className="text-sm text-slate-400 max-w-xs">
                                    Thank you for helping us improve. We&apos;ll review your report and get back to you.
                                </p>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setSubmitted(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all">
                                        Submit Another
                                    </button>
                                    <button onClick={close} className="px-4 py-2 rounded-xl bg-primary/15 border border-primary/20 text-primary text-sm font-bold hover:bg-primary/25 transition-all">
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Report Form */
                            <>
                                {/* Category Select */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Category</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat.value}
                                                onClick={() => setCategory(cat.value)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${category === cat.value
                                                        ? 'bg-primary/15 border-primary/30 text-primary'
                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Page */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Page / Section</label>
                                    <input
                                        type="text"
                                        value={page}
                                        onChange={e => setPage(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary/40 transition-colors"
                                        placeholder="e.g. Past Papers, AI Practice"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary/40 transition-colors resize-y min-h-[100px]"
                                        placeholder="Describe the issue in detail... What happened? What did you expect?"
                                    />
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !description.trim()}
                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${submitting || !description.trim()
                                            ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                            : 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                                        }`}
                                >
                                    {submitting ? (
                                        <><div className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" /> Submitting...</>
                                    ) : (
                                        <><span className="material-symbols-outlined text-base">send</span> Submit Report</>
                                    )}
                                </button>
                            </>
                        )
                    ) : (
                        /* History Tab */
                        loadingHistory ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : myReports.length === 0 ? (
                            <div className="text-center py-8 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                                    <span className="material-symbols-outlined text-slate-500 text-2xl">inbox</span>
                                </div>
                                <p className="text-sm text-slate-400 font-medium">No reports yet</p>
                                <p className="text-xs text-slate-600">Submit a report and it will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myReports.map(report => {
                                    const st = STATUS_COLORS[report.status] || STATUS_COLORS.open;
                                    return (
                                        <div key={report.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
                                            {/* Header row */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                                                        {st.label}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold">{report.category?.replace('_', ' ')}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-600">
                                                    {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm text-slate-300 leading-relaxed">{report.description}</p>

                                            {/* Admin Reply */}
                                            {report.admin_reply && (
                                                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 space-y-1">
                                                    <p className="text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">support_agent</span>
                                                        Admin Reply
                                                    </p>
                                                    <p className="text-sm text-slate-300 leading-relaxed">{report.admin_reply}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
