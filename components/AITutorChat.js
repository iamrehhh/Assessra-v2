'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSession } from 'next-auth/react';

const TONES = [
    { id: 'professional', label: 'Professional', icon: 'school', desc: 'Academic & rigorous' },
    { id: 'friend', label: 'Friend', icon: 'sentiment_satisfied', desc: 'Casual & encouraging' },
    { id: 'girlfriend', label: 'Girlfriend', icon: 'favorite', desc: 'Playful & endearing' },
    { id: 'boyfriend', label: 'Boyfriend', icon: 'favorite_border', desc: 'Caring & supportive' }
];

function groupByDate(conversations) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const defaultGreeting = {
        role: 'assistant',
        content: `Hi! I'm your **${subject.charAt(0).toUpperCase() + subject.slice(1)}** tutor. Ask me anything — concepts, revision, past papers, anything!`
    };

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTone, setSelectedTone] = useState('professional');
    const [showToneDropdown, setShowToneDropdown] = useState(false);

    // File Upload
    const [uploadText, setUploadText] = useState('');
    const [uploadingBook, setUploadingBook] = useState(false);
    const fileInputRef = useRef(null);

    // Flashcard
    const [generatingFlashcard, setGeneratingFlashcard] = useState(false);
    const [flashcardToast, setFlashcardToast] = useState('');

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    useEffect(() => {
        if (!email) return;
        const load = async () => {
            try {
                const res = await fetch(`/api/ai-tutor/history?email=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}`);
                if (res.ok) {
                    const data = await res.json();
                    const convs = data.conversations || [];
                    setConversations(convs);
                    if (convs.length > 0) {
                        await loadMessages(convs[0].id);
                    } else {
                        setMessages([defaultGreeting]);
                    }
                }
            } catch {
                setMessages([defaultGreeting]);
            }
        };
        load();
    }, [email, subject]);

    const loadMessages = async (convId) => {
        setCurrentConversationId(convId);
        setIsLoading(true);
        setMessages([]);
        try {
            const res = await fetch(`/api/ai-tutor/messages?conversationId=${encodeURIComponent(convId)}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages?.length > 0 ? data.messages : [defaultGreeting]);
            }
        } catch { }
        finally { setIsLoading(false); }
    };

    const startNewChat = () => {
        setCurrentConversationId(null);
        setMessages([defaultGreeting]);
        setInput('');
        setUploadText('');
    };

    // Auto-resize textarea
    const handleInputChange = (e) => {
        setInput(e.target.value);
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
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
        setUploadingBook(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/ai-tutor/upload', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                setUploadText(data.text);
                setMessages(prev => [...prev, { role: 'assistant', content: `📚 **"${file.name}" uploaded!** I'll use this as context for our conversation. What would you like to explore?` }]);
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
                setFlashcardToast(`✨ Flashcard saved: "${data.flashcard.topic}"`);
                setTimeout(() => setFlashcardToast(''), 4000);
            }
        } catch { }
        finally { setGeneratingFlashcard(false); }
    };

    const grouped = groupByDate(conversations);
    const currentTone = TONES.find(t => t.id === selectedTone);

    return (
        <div className="flex h-[calc(100vh-64px)] -m-4 md:-m-8 bg-bg-base overflow-hidden">

            {/* ─── Sidebar ─── */}
            <div className={`flex-shrink-0 flex flex-col border-r border-border-main bg-bg-card transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>

                {/* Sidebar Header */}
                <div className="p-4 space-y-2 border-b border-border-main">
                    <div className="flex items-center gap-2 text-text-main font-bold text-sm mb-3">
                        <span className="material-symbols-outlined text-primary">smart_toy</span>
                        <span>{subject.charAt(0).toUpperCase() + subject.slice(1)} Tutor</span>
                        <span className="ml-auto text-[10px] text-text-muted font-bold uppercase">{level}</span>
                    </div>
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold hover:bg-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        New Chat
                    </button>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                    {conversations.length === 0 ? (
                        <p className="text-xs text-text-muted px-4 py-4 text-center">No conversations yet.<br />Start a new chat!</p>
                    ) : (
                        Object.entries(grouped).map(([group, convs]) =>
                            convs.length === 0 ? null : (
                                <div key={group}>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted px-4 pt-4 pb-1">{group}</p>
                                    {convs.map(conv => (
                                        <button
                                            key={conv.id}
                                            onClick={() => loadMessages(conv.id)}
                                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm truncate transition-colors flex items-center gap-2 group ${currentConversationId === conv.id ? 'bg-primary/10 text-primary font-semibold' : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-main'}`}
                                        >
                                            <span className="material-symbols-outlined text-sm shrink-0 opacity-50 group-hover:opacity-100">chat_bubble</span>
                                            <span className="truncate">{conv.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )
                        )
                    )}
                </div>

                {/* Sidebar Footer - Back Button */}
                <div className="p-3 border-t border-border-main">
                    <button onClick={onBack} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Change Subject
                    </button>
                </div>
            </div>

            {/* ─── Main Chat ─── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Top Bar */}
                <div className="h-14 border-b border-border-main bg-bg-card/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(p => !p)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">menu</span>
                        </button>
                        <div className="h-5 w-px bg-border-main" />
                        {/* Flashcard button - clean pill */}
                        <button
                            onClick={handleCreateFlashcard}
                            disabled={generatingFlashcard || messages.length < 2}
                            title="Save Flashcard from this conversation"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-400/20 disabled:opacity-40 transition-all"
                        >
                            <span className={`material-symbols-outlined text-sm ${generatingFlashcard ? 'animate-spin' : ''}`}>
                                {generatingFlashcard ? 'sync' : 'style'}
                            </span>
                            {generatingFlashcard ? 'Saving…' : 'Flashcard'}
                        </button>

                        {/* Upload Book */}
                        <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingBook}
                            title={uploadText ? 'Book context loaded — click to replace' : 'Upload a PDF textbook for context'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all disabled:opacity-40 ${uploadText ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/20' : 'border-border-main bg-transparent text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5'}`}
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">{currentTone?.icon}</span>
                            <span className="hidden sm:inline">{currentTone?.label}</span>
                            <span className="material-symbols-outlined text-xs">expand_more</span>
                        </button>

                        {showToneDropdown && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowToneDropdown(false)} />
                                <div className="absolute right-0 top-full mt-2 w-52 bg-bg-card border border-border-main rounded-2xl shadow-2xl overflow-hidden z-20">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted px-4 pt-3 pb-1.5">AI Personality</p>
                                    {TONES.map(tone => (
                                        <button
                                            key={tone.id}
                                            onClick={() => { setSelectedTone(tone.id); setShowToneDropdown(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selectedTone === tone.id ? 'bg-primary/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                        >
                                            <span className={`material-symbols-outlined text-base ${selectedTone === tone.id ? 'text-primary' : 'text-text-muted'}`}>{tone.icon}</span>
                                            <div>
                                                <p className={`text-sm font-bold ${selectedTone === tone.id ? 'text-primary' : 'text-text-main'}`}>{tone.label}</p>
                                                <p className="text-[10px] text-text-muted">{tone.desc}</p>
                                            </div>
                                            {selectedTone === tone.id && <span className="material-symbols-outlined ml-auto text-primary text-base">check</span>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ─── Messages ─── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
                                {/* Avatar */}
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                                        <span className="material-symbols-outlined text-primary text-base">smart_toy</span>
                                    </div>
                                )}

                                {/* Bubble */}
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-tr-sm ml-auto'
                                    : 'bg-bg-card border border-border-main text-text-main rounded-tl-sm shadow-sm'
                                    }`}>
                                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'} leading-relaxed`}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isLoading && (
                            <div className="flex gap-3 flex-row animate-fade-in">
                                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                                    <span className="material-symbols-outlined text-primary text-base animate-pulse">smart_toy</span>
                                </div>
                                <div className="bg-bg-card border border-border-main rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                                    <div className="flex gap-1.5 items-center h-4">
                                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-primary/90 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* ─── Flashcard Toast ─── */}
                {flashcardToast && (
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg animate-fade-in z-30">
                        {flashcardToast}
                    </div>
                )}

                {/* ─── Input Area ─── */}
                <div className="shrink-0 border-t border-border-main bg-bg-base px-4 py-4">
                    <div className="max-w-3xl mx-auto">
                        <form onSubmit={handleSubmit} className="flex items-end gap-3 bg-bg-card border border-border-main rounded-2xl px-4 py-3 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
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
                                placeholder={`Ask about ${subject}…`}
                                rows={1}
                                className="flex-1 bg-transparent outline-none resize-none text-text-main placeholder-text-muted/50 text-sm leading-relaxed custom-scrollbar max-h-40 py-0.5"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all shrink-0 shadow-sm shadow-primary/30"
                            >
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
                            </button>
                        </form>
                        <p className="text-center text-[10px] text-text-muted mt-2 uppercase font-bold tracking-widest">
                            AI Tutor may make mistakes — verify important details.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
