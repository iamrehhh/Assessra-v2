'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSession } from 'next-auth/react';

const TONES = [
    { id: 'professional', label: 'Professional', icon: 'school', desc: 'Academic & rigorous' },
    { id: 'friend', label: 'Friend', icon: 'sentiment_satisfied', desc: 'Casual & encouraging' },
    { id: 'girlfriend', label: 'Girlfriend', icon: 'favorite', desc: 'Playful & endearing' },
    { id: 'boyfriend', label: 'Boyfriend', icon: 'favorite_border', desc: 'Caring & supportive' }
];

function groupByDate(conversations) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today - 86400000);
    const last7 = new Date(today - 7 * 86400000);
    const groups = { Today: [], Yesterday: [], 'Last 7 Days': [], Older: [] };
    for (const c of conversations) {
        const d = new Date(c.updated_at || c.created_at);
        if (d >= today) groups['Today'].push(c);
        else if (d >= yesterday) groups['Yesterday'].push(c);
        else if (d >= last7) groups['Last 7 Days'].push(c);
        else groups['Older'].push(c);
    }
    return groups;
}

function parseSuggestions(content) {
    if (!content) return { mainContent: '', suggestions: [] };
    const parts = content.split('SUGGESTIONS:');
    const mainContent = parts[0].trimEnd();
    const suggestions = (parts[1] || '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 3);
    return { mainContent, suggestions };
}

export default function AITutorChat({ subject, level, onBack }) {
    const { data: session } = useSession();
    const email = session?.user?.email;

    const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);

    const makeDefaultGreeting = useCallback(() => ({
        role: 'assistant',
        content: `Hi! I'm your **${subjectLabel}** tutor, trained on the **Cambridge ${level} syllabus**.\n\nAsk me anything — concepts, worked examples, past paper questions, or exam technique. I'll structure every answer the way Cambridge mark schemes expect.\n\nSUGGESTIONS: Explain a key ${subjectLabel} topic | Give me a past paper style question | What are the most common exam mistakes in ${subjectLabel}?`
    }), [subjectLabel, level]);

    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedTone, setSelectedTone] = useState('professional');
    const [showToneDropdown, setShowToneDropdown] = useState(false);
    const [uploadText, setUploadText] = useState('');
    const [uploadingBook, setUploadingBook] = useState(false);
    const fileInputRef = useRef(null);
    const [generatingFlashcard, setGeneratingFlashcard] = useState(false);
    const [flashcardToast, setFlashcardToast] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const abortControllerRef = useRef(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

    useEffect(() => {
        if (!email) return;
        const load = async () => {
            setLoadingMessages(true);
            try {
                const res = await fetch(`/api/ai-tutor/history?email=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}`);
                if (res.ok) {
                    const data = await res.json();
                    const convs = data.conversations || [];
                    setConversations(convs);
                    if (convs.length > 0) await fetchMessages(convs[0].id);
                    else setMessages([makeDefaultGreeting()]);
                } else setMessages([makeDefaultGreeting()]);
            } catch { setMessages([makeDefaultGreeting()]); }
            finally { setLoadingMessages(false); }
        };
        load();
    }, [email, subject]);

    const fetchMessages = async (convId) => {
        setCurrentConversationId(convId);
        try {
            const res = await fetch(`/api/ai-tutor/messages?conversationId=${encodeURIComponent(convId)}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages?.length > 0 ? data.messages : [makeDefaultGreeting()]);
            }
        } catch { setMessages([makeDefaultGreeting()]); }
    };

    const loadMessages = async (convId) => {
        if (convId === currentConversationId) return;
        if (isStreaming) { abortControllerRef.current?.abort(); setIsStreaming(false); setIsLoading(false); }
        setMessages([]);
        setCurrentConversationId(convId);
        await fetchMessages(convId);
    };

    const startNewChat = () => {
        abortControllerRef.current?.abort();
        setIsStreaming(false); setIsLoading(false);
        setCurrentConversationId(null);
        setMessages([makeDefaultGreeting()]);
        setInput(''); setUploadText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        const ta = textareaRef.current;
        if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; }
    };

    const handleSubmit = async (e, overrideInput) => {
        if (e) e.preventDefault();
        const text = (overrideInput ?? input).trim();
        if (!text || isLoading || isStreaming || !email) return;
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        let convId = currentConversationId;
        if (!convId) {
            try {
                const title = text.length > 40 ? text.substring(0, 40) + '…' : text;
                const r = await fetch('/api/ai-tutor/history', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, subject, level, title })
                });
                if (r.ok) {
                    const d = await r.json();
                    convId = d.conversation.id;
                    setCurrentConversationId(convId);
                    setConversations(prev => [d.conversation, ...prev]);
                }
            } catch { }
        }

        const newMessages = [...messages, { role: 'user', content: text }];
        setMessages([...newMessages, { role: 'assistant', content: '' }]);
        setIsLoading(true); setIsStreaming(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const res = await fetch('/api/ai-tutor/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, conversationId: convId, messages: newMessages, subject, level, tone: selectedTone, uploadText }),
                signal: controller.signal
            });
            if (!res.ok) throw new Error('API error');
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let acc = '';
            setIsLoading(false);
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                acc += decoder.decode(value, { stream: true });
                setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: acc }; return u; });
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                setMessages(prev => {
                    const u = [...prev];
                    if (u[u.length - 1]?.role === 'assistant') u[u.length - 1].content = 'Something went wrong. Please try again.';
                    return u;
                });
            }
        } finally { setIsLoading(false); setIsStreaming(false); abortControllerRef.current = null; }
    };

    const handleRegenerate = () => {
        if (messages.length < 2 || isStreaming) return;
        const withoutLast = messages.slice(0, -1);
        const lastUser = [...withoutLast].reverse().find(m => m.role === 'user');
        if (!lastUser) return;
        setMessages(withoutLast);
        handleSubmit(null, lastUser.content);
    };

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(parseSuggestions(text).mainContent);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !email) return;
        if (file.size > 5 * 1024 * 1024) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ **File too large.** Please upload under 5 MB.' }]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setUploadingBook(true);
        const fd = new FormData(); fd.append('file', file);
        try {
            const res = await fetch('/api/ai-tutor/upload', { method: 'POST', body: fd });
            if (res.ok) {
                const data = await res.json();
                setUploadText(data.text);
                setMessages(prev => [...prev, { role: 'assistant', content: `📚 **"${file.name}" uploaded!** I'll use this as my primary reference.\n\nSUGGESTIONS: Summarise the key topics | Explain the hardest concept | Give me practice questions` }]);
            }
        } catch { }
        finally { setUploadingBook(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleCreateFlashcard = async () => {
        if (!email || messages.length < 2 || generatingFlashcard) return;
        setGeneratingFlashcard(true);
        try {
            const context = messages.slice(-4).map(m => m.content).join('\n');
            const res = await fetch('/api/ai-tutor/flashcard', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, subject, contextMessage: context })
            });
            if (res.ok) {
                const data = await res.json();
                setFlashcardToast(`✨ Saved: "${data.flashcard.topic}"`);
                setTimeout(() => setFlashcardToast(''), 3500);
            }
        } catch { }
        finally { setGeneratingFlashcard(false); }
    };

    const grouped = groupByDate(conversations);
    const currentTone = TONES.find(t => t.id === selectedTone);

    return (
        <>
            {/* ── Scoped styles: only affect this component, use your CSS vars ── */}
            <style>{`
                .ait-wrap { font-size: 14px; }

                /* Message entrance animation */
                @keyframes ait-in {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .ait-msg-in { animation: ait-in 0.2s ease forwards; }

                /* Thinking dots */
                @keyframes ait-dot {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
                    30%           { transform: translateY(-5px); opacity: 1; }
                }
                .ait-d1 { animation: ait-dot 1.2s ease-in-out infinite 0s; }
                .ait-d2 { animation: ait-dot 1.2s ease-in-out infinite 0.15s; }
                .ait-d3 { animation: ait-dot 1.2s ease-in-out infinite 0.3s; }

                /* Cursor blink */
                @keyframes ait-blink { 0%,100%{opacity:1} 50%{opacity:0} }
                .ait-cursor { animation: ait-blink 0.9s ease-in-out infinite; }

                /* Scrollbars */
                .ait-scroll::-webkit-scrollbar { width: 4px; }
                .ait-scroll::-webkit-scrollbar-track { background: transparent; }
                .ait-scroll::-webkit-scrollbar-thumb { background: var(--border-main, #e5e7eb); border-radius: 99px; }

                /* ── Markdown inside AI bubble ── */
                .ait-prose { line-height: 1.75; color: var(--text-main); }
                .ait-prose p  { margin: 0.45em 0; }
                .ait-prose p:first-child { margin-top: 0; }
                .ait-prose p:last-child  { margin-bottom: 0; }
                .ait-prose strong { font-weight: 650; color: var(--text-main); }
                .ait-prose em { font-style: italic; opacity: 0.85; }

                /* Headings — this is the big fix from the screenshot */
                .ait-prose h1, .ait-prose h2, .ait-prose h3 {
                    font-weight: 700;
                    color: var(--text-main);
                    margin: 1em 0 0.35em;
                    line-height: 1.3;
                }
                .ait-prose h1 { font-size: 16px; }
                .ait-prose h2 { font-size: 14.5px; border-bottom: 1px solid var(--border-main, #e5e7eb); padding-bottom: 4px; }
                .ait-prose h3 { font-size: 13.5px; }
                .ait-prose h1:first-child,
                .ait-prose h2:first-child,
                .ait-prose h3:first-child { margin-top: 0; }

                /* Lists */
                .ait-prose ul { list-style: none; padding: 0; margin: 0.5em 0; }
                .ait-prose ul li { padding-left: 1.25em; position: relative; margin: 0.3em 0; }
                .ait-prose ul li::before {
                    content: '';
                    position: absolute; left: 0; top: 0.6em;
                    width: 5px; height: 5px; border-radius: 99px;
                    background: var(--primary, #22c55e);
                    opacity: 0.7;
                }
                .ait-prose ol { padding-left: 1.4em; margin: 0.5em 0; }
                .ait-prose ol li { margin: 0.3em 0; padding-left: 0.2em; }

                /* Code */
                .ait-prose code {
                    font-family: 'DM Mono', 'Fira Code', monospace;
                    font-size: 12.5px;
                    background: var(--bg-base, #f9f9f7);
                    border: 1px solid var(--border-main, #e5e7eb);
                    padding: 1px 5px;
                    border-radius: 5px;
                    color: var(--text-main);
                }
                .ait-prose pre {
                    background: var(--bg-base, #f9f9f7);
                    border: 1px solid var(--border-main, #e5e7eb);
                    border-radius: 10px;
                    padding: 14px 16px;
                    overflow-x: auto;
                    margin: 0.75em 0;
                }
                .ait-prose pre code {
                    background: none;
                    border: none;
                    padding: 0;
                    font-size: 12.5px;
                    line-height: 1.6;
                }

                /* Blockquote — exam tips */
                .ait-prose blockquote {
                    border-left: 3px solid var(--primary, #22c55e);
                    margin: 0.75em 0;
                    padding: 6px 0 6px 14px;
                    opacity: 0.8;
                    font-style: italic;
                }

                /* HR */
                .ait-prose hr {
                    border: none;
                    border-top: 1px solid var(--border-main, #e5e7eb);
                    margin: 0.75em 0;
                }

                /* Tables */
                .ait-prose table { width: 100%; border-collapse: collapse; margin: 0.75em 0; font-size: 13px; }
                .ait-prose th { background: var(--bg-base); font-weight: 600; padding: 6px 10px; border: 1px solid var(--border-main); text-align: left; }
                .ait-prose td { padding: 6px 10px; border: 1px solid var(--border-main); }

                /* Suggestion chips hover */
                .ait-chip:hover { opacity: 0.85; transform: translateY(-1px); }
                .ait-chip:active { transform: scale(0.97); }

                /* Action buttons */
                .ait-action:hover { background: var(--bg-base) !important; color: var(--text-main) !important; }
            `}</style>

            <div className="ait-wrap flex h-full w-full bg-bg-base overflow-hidden">

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <div className={`flex-shrink-0 flex flex-col border-r border-border-main bg-bg-card/60 transition-[width] duration-200 ease-in-out ${sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'}`}>
                    <div className="w-60 flex flex-col h-full min-w-0">

                        {/* Subject header */}
                        <div className="p-3 border-b border-border-main shrink-0">
                            <div className="flex items-center gap-2.5 px-1 mb-3">
                                {/* Nicer avatar — circle with subject initial */}
                                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                                    <span className="text-primary font-bold text-sm">{subjectLabel[0]}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-text-main text-sm truncate">{subjectLabel} Tutor</p>
                                    <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">{level}</p>
                                </div>
                            </div>
                            <button onClick={startNewChat}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 active:scale-[0.98] transition-all">
                                <span className="material-symbols-outlined text-sm">add</span>
                                New Chat
                            </button>
                        </div>

                        {/* Conversation list */}
                        <div className="ait-scroll flex-1 overflow-y-auto py-2">
                            {conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-28 text-center px-4 gap-2">
                                    <span className="material-symbols-outlined text-text-muted text-2xl opacity-40">chat_bubble_outline</span>
                                    <p className="text-[11px] text-text-muted">No conversations yet</p>
                                </div>
                            ) : (
                                Object.entries(grouped).map(([group, convs]) =>
                                    convs.length === 0 ? null : (
                                        <div key={group} className="px-2 mb-3">
                                            <p className="text-[9px] uppercase font-bold tracking-[0.12em] text-text-muted px-2 py-1">{group}</p>
                                            {convs.map(conv => (
                                                <button key={conv.id} onClick={() => loadMessages(conv.id)}
                                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs truncate transition-all flex items-center gap-2 mb-0.5 ${currentConversationId === conv.id
                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                        : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-main'}`}>
                                                    <span className="material-symbols-outlined text-[11px] shrink-0 opacity-50">chat_bubble</span>
                                                    <span className="truncate">{conv.title}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )
                                )
                            )}
                        </div>

                        {/* Back */}
                        <div className="p-2 border-t border-border-main shrink-0">
                            <button onClick={onBack} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                Change Subject
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Main ────────────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden relative">

                    {/* Top bar */}
                    <div className="relative z-40 h-12 border-b border-border-main bg-bg-card/80 backdrop-blur-sm px-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSidebarOpen(p => !p)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-main transition-colors">
                                <span className="material-symbols-outlined text-xl">menu</span>
                            </button>
                            <div className="h-4 w-px bg-border-main" />

                            {/* Flashcard */}
                            <button onClick={handleCreateFlashcard} disabled={generatingFlashcard || messages.length < 2 || isStreaming}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold hover:bg-amber-400/20 disabled:opacity-40 transition-all">
                                <span className={`material-symbols-outlined text-sm ${generatingFlashcard ? 'animate-spin' : ''}`}>{generatingFlashcard ? 'sync' : 'style'}</span>
                                <span className="hidden sm:inline">{generatingFlashcard ? 'Saving…' : 'Flashcard'}</span>
                            </button>

                            {/* Upload */}
                            <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingBook || isStreaming}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all disabled:opacity-40 ${uploadText
                                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/20'
                                    : 'border-border-main text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                <span className={`material-symbols-outlined text-sm ${uploadingBook ? 'animate-spin' : ''}`}>{uploadingBook ? 'sync' : uploadText ? 'check_circle' : 'upload_file'}</span>
                                <span className="hidden sm:inline">{uploadingBook ? 'Reading…' : uploadText ? 'Book Loaded' : 'Upload PDF'}</span>
                            </button>
                        </div>

                        {/* Tone selector */}
                        <div className="relative">
                            <button onClick={() => setShowToneDropdown(p => !p)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-all">
                                <span className="material-symbols-outlined text-sm">{currentTone?.icon}</span>
                                <span className="hidden sm:inline">{currentTone?.label}</span>
                                <span className="material-symbols-outlined text-xs">expand_more</span>
                            </button>
                            {showToneDropdown && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowToneDropdown(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-bg-card border border-border-main rounded-2xl shadow-xl overflow-hidden z-20">
                                        <p className="text-[9px] uppercase font-bold tracking-widest text-text-muted px-3 pt-3 pb-1">Personality</p>
                                        {TONES.map(tone => (
                                            <button key={tone.id} onClick={() => { setSelectedTone(tone.id); setShowToneDropdown(false); }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${selectedTone === tone.id ? 'bg-primary/8' : 'hover:bg-black/4 dark:hover:bg-white/4'}`}>
                                                <span className={`material-symbols-outlined text-base ${selectedTone === tone.id ? 'text-primary' : 'text-text-muted'}`}>{tone.icon}</span>
                                                <div className="flex-1">
                                                    <p className={`text-xs font-semibold ${selectedTone === tone.id ? 'text-primary' : 'text-text-main'}`}>{tone.label}</p>
                                                    <p className="text-[10px] text-text-muted">{tone.desc}</p>
                                                </div>
                                                {selectedTone === tone.id && <span className="material-symbols-outlined text-primary text-sm">check</span>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Messages ────────────────────────────────────────── */}
                    <div className="ait-scroll flex-1 overflow-y-auto bg-bg-base">
                        {loadingMessages ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
                                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <span className="text-sm">Loading…</span>
                            </div>
                        ) : (
                            <div className="max-w-[680px] mx-auto px-4 py-8 flex flex-col gap-8">
                                {messages.map((msg, idx) => {
                                    const { mainContent, suggestions } = parseSuggestions(msg.content);
                                    const isUser = msg.role === 'user';
                                    const isThisStreaming = isStreaming && idx === messages.length - 1 && !isUser;
                                    const isLastAssistant = !isStreaming && idx === messages.length - 1 && !isUser;
                                    const showSuggestions = !isUser && suggestions.length > 0 && !isThisStreaming;

                                    return (
                                        <div key={idx} className={`ait-msg-in group flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>

                                            {/* Row: avatar + bubble */}
                                            <div className={`flex items-end gap-2.5 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                                                {/* AI avatar */}
                                                {!isUser && (
                                                    <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mb-0.5">
                                                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '13px' }}>smart_toy</span>
                                                    </div>
                                                )}

                                                {/* Bubble */}
                                                <div className={`relative ${isUser ? 'max-w-[72%]' : 'max-w-[88%]'}`}>
                                                    <div className={
                                                        isUser
                                                            /* User: solid primary colour, sharper bottom-right corner */
                                                            ? 'bg-primary text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm'
                                                            /* AI: card bg, subtle border, sharper bottom-left corner */
                                                            : 'bg-bg-card border border-border-main px-5 py-4 rounded-2xl rounded-bl-md shadow-sm'
                                                    }>
                                                        {isUser ? (
                                                            <p className="text-[14px] leading-[1.7] text-white">{mainContent}</p>
                                                        ) : (
                                                            <div className="ait-prose">
                                                                <ReactMarkdown>{mainContent || ' '}</ReactMarkdown>
                                                                {isThisStreaming && mainContent && (
                                                                    <span className="ait-cursor inline-block w-[2px] h-[1em] ml-0.5 bg-text-muted rounded-sm align-middle opacity-70" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action row — appears on hover, below the bubble */}
                                            {!isUser && mainContent && !isThisStreaming && (
                                                <div className="flex items-center gap-1 pl-9 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                    <button onClick={() => handleCopy(msg.content, idx)}
                                                        className="ait-action flex items-center gap-1 px-2 py-1 rounded-lg border border-border-main bg-bg-card text-text-muted text-[11px] font-medium shadow-sm transition-all">
                                                        <span className="material-symbols-outlined text-[11px]">{copiedId === idx ? 'check' : 'content_copy'}</span>
                                                        {copiedId === idx ? 'Copied!' : 'Copy'}
                                                    </button>
                                                    {isLastAssistant && (
                                                        <button onClick={handleRegenerate}
                                                            className="ait-action flex items-center gap-1 px-2 py-1 rounded-lg border border-border-main bg-bg-card text-text-muted text-[11px] font-medium shadow-sm transition-all">
                                                            <span className="material-symbols-outlined text-[11px]">refresh</span>
                                                            Regenerate
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Suggestion chips */}
                                            {showSuggestions && (
                                                <div className="flex flex-wrap gap-2 pl-9">
                                                    {suggestions.map((q, i) => (
                                                        <button key={i} onClick={() => handleSubmit(null, q)}
                                                            className="ait-chip flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-primary text-[11px] font-medium transition-all">
                                                            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Thinking dots */}
                                {isLoading && (
                                    <div className="ait-msg-in flex items-end gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontSize: '13px' }}>smart_toy</span>
                                        </div>
                                        <div className="bg-bg-card border border-border-main rounded-2xl rounded-bl-md px-5 py-4 shadow-sm flex items-center gap-1.5">
                                            <span className="ait-d1 w-2 h-2 rounded-full bg-primary/40 inline-block" />
                                            <span className="ait-d2 w-2 h-2 rounded-full bg-primary/60 inline-block" />
                                            <span className="ait-d3 w-2 h-2 rounded-full bg-primary/80 inline-block" />
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} className="h-2" />
                            </div>
                        )}
                    </div>

                    {/* Flashcard toast */}
                    {flashcardToast && (
                        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-bg-card border border-border-main text-text-main text-[12px] font-semibold px-5 py-2.5 rounded-full shadow-xl z-30 whitespace-nowrap ait-msg-in">
                            {flashcardToast}
                        </div>
                    )}

                    {/* ── Input ───────────────────────────────────────────── */}
                    <div className="shrink-0 px-4 py-4 bg-bg-base">
                        <div className="max-w-[680px] mx-auto">
                            {/* Input card — elevated look */}
                            <div className="flex items-end gap-2 bg-bg-card border border-border-main rounded-2xl px-4 py-3 shadow-md transition-all duration-150 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(var(--primary-rgb,34,197,94),0.08),0_4px_12px_rgba(0,0,0,0.06)]">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                                    placeholder={`Ask about ${subjectLabel}…`}
                                    rows={1}
                                    style={{ height: 'auto', minHeight: '24px' }}
                                    className="ait-scroll flex-1 bg-transparent outline-none resize-none text-text-main placeholder-text-muted/50 text-[14px] leading-6 py-0.5 max-h-36"
                                />
                                <div className="flex items-center gap-2 shrink-0 mb-0.5">
                                    {input.length > 900 && (
                                        <span className={`text-[10px] font-semibold ${input.length > 1500 ? 'text-red-400' : 'text-text-muted'}`}>
                                            {input.length}/2000
                                        </span>
                                    )}
                                    {isStreaming ? (
                                        <button onClick={() => { abortControllerRef.current?.abort(); setIsStreaming(false); setIsLoading(false); }}
                                            className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-400/30 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all">
                                            <span className="material-symbols-outlined text-sm">stop</span>
                                        </button>
                                    ) : (
                                        <button onClick={handleSubmit} disabled={!input.trim() || isLoading}
                                            className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-sm">
                                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-center text-[10px] text-text-muted/60 mt-2 font-medium tracking-wide">
                                Cambridge {level} · {subjectLabel} · Verify important answers with your syllabus
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
