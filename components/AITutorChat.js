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

export default function AITutorChat({ subject, level, onBack }) {
    const { data: session } = useSession();
    const email = session?.user?.email;

    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);
    const defaultGreeting = {
        role: 'assistant',
        content: `Hi! I'm your **${subjectLabel}** tutor. Ask me anything — concepts, revision, examples, or past paper help!`
    };

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTone, setSelectedTone] = useState('professional');
    const [showToneDropdown, setShowToneDropdown] = useState(false);

    const [uploadText, setUploadText] = useState('');
    const [uploadingBook, setUploadingBook] = useState(false);
    const fileInputRef = useRef(null);

    const [generatingFlashcard, setGeneratingFlashcard] = useState(false);
    const [flashcardToast, setFlashcardToast] = useState('');

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    // Load conversations on mount
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
                    if (convs.length > 0) {
                        await fetchMessages(convs[0].id);
                    } else {
                        setMessages([defaultGreeting]);
                    }
                } else {
                    setMessages([defaultGreeting]);
                }
            } catch {
                setMessages([defaultGreeting]);
            } finally {
                setLoadingMessages(false);
            }
        };
        load();
    }, [email, subject]);

    const fetchMessages = async (convId) => {
        setCurrentConversationId(convId);
        try {
            const res = await fetch(`/api/ai-tutor/messages?conversationId=${encodeURIComponent(convId)}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages?.length > 0 ? data.messages : [defaultGreeting]);
            }
        } catch {
            setMessages([defaultGreeting]);
        }
    };

    const loadMessages = async (convId) => {
        if (convId === currentConversationId) return;
        setMessages([]);
        setCurrentConversationId(convId);
        await fetchMessages(convId);
    };

    const startNewChat = () => {
        setCurrentConversationId(null);
        setMessages([defaultGreeting]);
        setInput('');
        setUploadText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading || !email) return;

        const userMsgContent = input.trim();
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        let convId = currentConversationId;

        if (!convId) {
            try {
                const title = userMsgContent.length > 40 ? userMsgContent.substring(0, 40) + '…' : userMsgContent;
                const crRes = await fetch('/api/ai-tutor/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, subject, level, title })
                });
                if (crRes.ok) {
                    const data = await crRes.json();
                    convId = data.conversation.id;
                    setCurrentConversationId(convId);
                    setConversations(prev => [data.conversation, ...prev]);
                }
            } catch { }
        }

        const newMessages = [...messages, { role: 'user', content: userMsgContent }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const res = await fetch('/api/ai-tutor/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, conversationId: convId, messages: newMessages, subject, level, tone: selectedTone, uploadText })
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your network.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !email) return;

        const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_SIZE) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ **File too large.** Please upload a PDF under **5 MB** to keep token usage efficient. For large textbooks, ask your admin to upload them via the Admin Panel instead.' }]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setUploadingBook(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/ai-tutor/upload', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                setUploadText(data.text);
                setMessages(prev => [...prev, { role: 'assistant', content: `📚 **"${file.name}" uploaded!** I'll use this as reference for our session. What would you like to explore?` }]);
            }
        } catch { }
        finally {
            setUploadingBook(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreateFlashcard = async () => {
        if (!email || messages.length < 2 || generatingFlashcard) return;
        setGeneratingFlashcard(true);
        try {
            const context = messages.slice(-4).map(m => m.content).join('\n');
            const res = await fetch('/api/ai-tutor/flashcard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        <div className="flex h-[calc(100vh-64px)] -m-4 md:-m-8 bg-bg-base overflow-hidden">

            {/* ─── Sidebar ─── */}
            <div className={`flex-shrink-0 flex flex-col border-r border-border-main bg-bg-card/60 transition-[width] duration-200 ease-in-out ${sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'}`}>
                <div className="w-60 flex flex-col h-full min-w-0">

                    {/* Sidebar Top */}
                    <div className="p-3 border-b border-border-main shrink-0">
                        <div className="flex items-center gap-2 px-1 mb-3">
                            <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                            <div className="min-w-0">
                                <p className="font-bold text-text-main text-sm truncate">{subjectLabel} Tutor</p>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{level}</p>
                            </div>
                        </div>
                        <button
                            onClick={startNewChat}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-base">add</span>
                            New Chat
                        </button>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                                <span className="material-symbols-outlined text-text-muted text-3xl mb-2">chat_bubble_outline</span>
                                <p className="text-xs text-text-muted">No conversations yet</p>
                            </div>
                        ) : (
                            Object.entries(grouped).map(([group, convs]) =>
                                convs.length === 0 ? null : (
                                    <div key={group} className="px-2 mt-2">
                                        <p className="text-[9px] uppercase font-bold tracking-widest text-text-muted px-2 py-1.5">{group}</p>
                                        {convs.map(conv => (
                                            <button
                                                key={conv.id}
                                                onClick={() => loadMessages(conv.id)}
                                                className={`w-full text-left px-2 py-2 rounded-lg text-xs truncate transition-all flex items-center gap-2 ${currentConversationId === conv.id ? 'bg-primary/10 text-primary font-semibold' : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-main'}`}
                                            >
                                                <span className="material-symbols-outlined text-xs shrink-0 opacity-60">chat_bubble</span>
                                                <span className="truncate">{conv.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                )
                            )
                        )}
                    </div>

                    {/* Change Subject */}
                    <div className="p-2 border-t border-border-main shrink-0">
                        <button onClick={onBack} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Change Subject
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Main Chat ─── */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Top Bar */}
                <div className="h-12 border-b border-border-main bg-bg-card/70 backdrop-blur-sm px-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSidebarOpen(p => !p)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-main transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">menu</span>
                        </button>
                        <div className="h-4 w-px bg-border-main mx-1" />

                        {/* Flashcard pill */}
                        <button
                            onClick={handleCreateFlashcard}
                            disabled={generatingFlashcard || messages.length < 2}
                            title="Save a flashcard from this conversation"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold hover:bg-amber-400/20 disabled:opacity-40 transition-all"
                        >
                            <span className={`material-symbols-outlined text-sm ${generatingFlashcard ? 'animate-spin' : ''}`}>
                                {generatingFlashcard ? 'sync' : 'style'}
                            </span>
                            <span className="hidden sm:inline">{generatingFlashcard ? 'Saving…' : 'Flashcard'}</span>
                        </button>

                        {/* Upload Book pill */}
                        <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingBook}
                            title={uploadText ? 'Book loaded — click to replace' : 'Upload a PDF for context'}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all disabled:opacity-40 ${uploadText
                                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400'
                                : 'border-border-main text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-sm ${uploadingBook ? 'animate-spin' : ''}`}>
                                {uploadingBook ? 'sync' : uploadText ? 'check_circle' : 'upload_file'}
                            </span>
                            <span className="hidden sm:inline">{uploadingBook ? 'Reading…' : uploadText ? 'Book Loaded' : 'Upload Book'}</span>
                        </button>
                    </div>

                    {/* Tone Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowToneDropdown(p => !p)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold hover:bg-primary/20 transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">{currentTone?.icon}</span>
                            <span className="hidden sm:inline">{currentTone?.label}</span>
                            <span className="material-symbols-outlined text-xs">expand_more</span>
                        </button>

                        {showToneDropdown && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowToneDropdown(false)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-bg-card border border-border-main rounded-xl shadow-xl overflow-hidden z-20">
                                    <p className="text-[9px] uppercase font-bold tracking-widest text-text-muted px-3 pt-2.5 pb-1">Personality</p>
                                    {TONES.map(tone => (
                                        <button
                                            key={tone.id}
                                            onClick={() => { setSelectedTone(tone.id); setShowToneDropdown(false); }}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${selectedTone === tone.id ? 'bg-primary/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                        >
                                            <span className={`material-symbols-outlined text-base ${selectedTone === tone.id ? 'text-primary' : 'text-text-muted'}`}>{tone.icon}</span>
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold ${selectedTone === tone.id ? 'text-primary' : 'text-text-main'}`}>{tone.label}</p>
                                                <p className="text-[9px] text-text-muted">{tone.desc}</p>
                                            </div>
                                            {selectedTone === tone.id && <span className="material-symbols-outlined text-primary text-sm">check</span>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ─── Messages ─── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loadingMessages ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="flex flex-col items-center gap-3 text-text-muted">
                                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <span className="text-sm">Loading…</span>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="material-symbols-outlined text-primary" style={{ fontSize: '14px' }}>smart_toy</span>
                                        </div>
                                    )}
                                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${msg.role === 'user'
                                        ? 'bg-primary text-white rounded-tr-sm'
                                        : 'bg-bg-card border border-border-main text-text-main rounded-tl-sm shadow-sm'
                                        }`}>
                                        <div className={`prose prose-sm max-w-none text-[14px] leading-relaxed ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Thinking indicator */}
                            {isLoading && (
                                <div className="flex gap-3 flex-row animate-fade-in">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontSize: '14px' }}>smart_toy</span>
                                    </div>
                                    <div className="bg-bg-card border border-border-main rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                        <div className="flex gap-1 items-center">
                                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-primary/90 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Flashcard Toast */}
                {flashcardToast && (
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl animate-fade-in z-30 whitespace-nowrap">
                        {flashcardToast}
                    </div>
                )}

                {/* ─── Input Area ─── */}
                <div className="shrink-0 bg-bg-base px-4 py-3">
                    <div className="max-w-2xl mx-auto">
                        <form
                            onSubmit={handleSubmit}
                            className="flex items-end gap-2 bg-bg-card border border-border-main rounded-xl px-3 py-2 shadow-sm focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/15 transition-all"
                        >
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                placeholder={`Ask about ${subjectLabel}…`}
                                rows={1}
                                style={{ height: 'auto', minHeight: '24px' }}
                                className="flex-1 bg-transparent outline-none resize-none text-text-main placeholder-text-muted/50 text-sm leading-6 custom-scrollbar py-0.5 max-h-36"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5"
                            >
                                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
                            </button>
                        </form>
                        <p className="text-center text-[9px] text-text-muted mt-1.5 uppercase font-bold tracking-wider">
                            AI may make mistakes — verify important details
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
