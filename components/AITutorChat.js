'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSession } from 'next-auth/react';

const TONES = [
    { id: 'professional', label: 'Professional', icon: 'school', desc: 'Academic, rigorous, and formal' },
    { id: 'friend', label: 'Friend', icon: 'sentiment_satisfied', desc: 'Casual, encouraging, and clear' },
    { id: 'girlfriend', label: 'Girlfriend', icon: 'favorite', desc: 'Playful, endearing, and smart' },
    { id: 'boyfriend', label: 'Boyfriend', icon: 'favorite', desc: 'Caring, supportive, and clever' }
];

export default function AITutorChat({ subject, level, onBack }) {
    const { data: session } = useSession();
    const email = session?.user?.email;

    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [messages, setMessages] = useState([]);

    // Default greeting if no messages
    const defaultGreeting = {
        role: 'assistant',
        content: `Hi! I'm your AI Tutor for **${subject.charAt(0).toUpperCase() + subject.slice(1)}**. How can I help you today?`
    };

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTone, setSelectedTone] = useState('professional');
    const [showToneDropdown, setShowToneDropdown] = useState(false);

    // File Upload State
    const [uploadText, setUploadText] = useState('');
    const [uploadingBook, setUploadingBook] = useState(false);
    const fileInputRef = useRef(null);

    // Flashcard State
    const [generatingFlashcard, setGeneratingFlashcard] = useState(false);
    const [flashcardSuccess, setFlashcardSuccess] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Fetch conversation history on mount
    useEffect(() => {
        if (!email) return;

        const loadConversations = async () => {
            try {
                const res = await fetch(`/api/ai-tutor/history?email=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}`);
                if (res.ok) {
                    const data = await res.json();
                    setConversations(data.conversations || []);
                    if (data.conversations && data.conversations.length > 0) {
                        loadMessages(data.conversations[0].id);
                    } else {
                        setMessages([defaultGreeting]);
                    }
                }
            } catch (err) {
                console.error('Failed to load history', err);
                setMessages([defaultGreeting]);
            }
        };

        loadConversations();
    }, [email, subject]);

    const loadMessages = async (convId) => {
        setCurrentConversationId(convId);
        setIsLoading(true);
        try {
            const res = await fetch(`/api/ai-tutor/messages?conversationId=${encodeURIComponent(convId)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    setMessages(data.messages);
                } else {
                    setMessages([defaultGreeting]);
                }
            }
        } catch (err) {
            console.error('Failed to load messages', err);
        } finally {
            setIsLoading(false);
        }
    };

    const createNewConversation = () => {
        setCurrentConversationId(null);
        setMessages([defaultGreeting]);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading || !email) return;

        const userMsgContent = input.trim();
        setInput('');

        let convId = currentConversationId;

        // If no conversation ID, create one
        if (!convId) {
            try {
                const title = userMsgContent.length > 30 ? userMsgContent.substring(0, 30) + "..." : userMsgContent;
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
            } catch (err) {
                console.error('Failed to create conversation', err);
            }
        }

        const newMessages = [...messages, { role: 'user', content: userMsgContent }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const res = await fetch('/api/ai-tutor/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    conversationId: convId,
                    messages: newMessages,
                    subject,
                    level,
                    tone: selectedTone,
                    uploadText: uploadText
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }]);
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error while contacting the AI.' }]);
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
            const res = await fetch('/api/ai-tutor/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setUploadText(data.text);
                setMessages(prev => [...prev, { role: 'assistant', content: `📚 **Book Uploaded Successfully!**\n\nI have received ${file.name} and can use it as reference for our conversation. What would you like to know about it?` }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: '❌ Sorry, I failed to process that book.' }]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUploadingBook(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreateFlashcard = async () => {
        if (!email || messages.length < 2) return;
        setGeneratingFlashcard(true);
        setFlashcardSuccess(false);

        try {
            // Get the last substantive response or conversation context
            const contextMessage = messages.length > 2 ? messages.slice(-3).map(m => m.content).join('\n') : messages[messages.length - 1].content;

            const res = await fetch('/api/ai-tutor/flashcard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, subject, contextMessage })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', content: `✨ **Flashcard Created: ${data.flashcard.topic}**\n\n**Front:** ${data.flashcard.front}\n\n**Back:** ${data.flashcard.back}` }]);
                setFlashcardSuccess(true);
                setTimeout(() => setFlashcardSuccess(false), 3000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGeneratingFlashcard(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-bg-base animate-fade-in -m-4 md:-m-8">
            {/* Chat Header */}
            <div className="h-16 border-b border-border-main bg-bg-card/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-text-muted transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="font-bold text-text-main flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
                            {subject.charAt(0).toUpperCase() + subject.slice(1)} Tutor
                        </h2>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">{level}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative">
                    <input
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingBook}
                        className={`h-10 px-4 rounded-full border flex items-center gap-2 text-sm font-bold transition-colors ${uploadText ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-black/5 dark:bg-white/5 border-border-main text-text-muted hover:text-text-main'} disabled:opacity-50`}
                    >
                        {uploadingBook ? (
                            <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                        ) : uploadText ? (
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                        ) : (
                            <span className="material-symbols-outlined text-lg">upload_file</span>
                        )}
                        <span className="hidden sm:inline">{uploadingBook ? 'Reading...' : uploadText ? 'Book Re-upload' : 'Upload Book'}</span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowToneDropdown(!showToneDropdown)}
                            className="h-10 px-4 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
                        >
                            <span className="material-symbols-outlined text-lg">{TONES.find(t => t.id === selectedTone)?.icon || 'school'}</span>
                            <span className="hidden sm:inline">{TONES.find(t => t.id === selectedTone)?.label || 'Tone'}</span>
                            <span className="material-symbols-outlined text-sm">expand_more</span>
                        </button>

                        {showToneDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-bg-card border border-border-main rounded-2xl shadow-xl overflow-hidden z-20">
                                {TONES.map(tone => (
                                    <button
                                        key={tone.id}
                                        onClick={() => { setSelectedTone(tone.id); setShowToneDropdown(false); }}
                                        className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${selectedTone === tone.id ? 'bg-primary/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        <span className={`material-symbols-outlined mt-0.5 ${selectedTone === tone.id ? 'text-primary' : 'text-text-muted'}`}>{tone.icon}</span>
                                        <div>
                                            <p className={`font-bold text-sm ${selectedTone === tone.id ? 'text-primary' : 'text-text-main'}`}>{tone.label}</p>
                                            <p className="text-[10px] text-text-muted mt-0.5">{tone.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Area & Sidebar Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* History Sidebar */}
                <div className="hidden lg:flex w-64 border-r border-border-main flex-col bg-bg-card/30">
                    <div className="p-4">
                        <button onClick={createNewConversation} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                            <span className="material-symbols-outlined">add</span>
                            New Chat
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 pb-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-3 py-2">Conversations</p>
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => loadMessages(conv.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${currentConversationId === conv.id ? 'bg-black/10 dark:bg-white/10 text-text-main font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 text-text-muted'}`}
                            >
                                {conv.title}
                            </button>
                        ))}
                        {conversations.length === 0 && (
                            <p className="text-xs text-text-muted px-3 mt-2">No past conversations.</p>
                        )}
                    </div>
                </div>

                {/* Main Chat Content */}
                <div className="flex-1 flex flex-col relative">
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                <div className={`max-w-[85%] md:max-w-[75%] rounded-3xl px-6 py-4 flex gap-4 ${msg.role === 'user'
                                        ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-sm'
                                        : 'bg-bg-card border border-border-main text-text-main rounded-bl-sm shadow-sm'
                                    }`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 text-primary">
                                            <span className="material-symbols-outlined text-base">smart_toy</span>
                                        </div>
                                    )}
                                    <div className={`prose ${msg.role === 'user' ? 'prose-invert dark:prose-p:text-black' : 'dark:prose-invert'} max-w-none text-[15px] leading-relaxed`}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-bg-card border border-border-main rounded-3xl rounded-bl-sm px-6 py-4 flex gap-4 items-center shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 text-primary">
                                        <span className="material-symbols-outlined text-base animate-pulse">smart_toy</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-gradient-to-t from-bg-base via-bg-base/95 to-transparent shrink-0">
                        <div className="max-w-4xl mx-auto relative">
                            <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-bg-card border border-border-main rounded-3xl p-2 pl-4 shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                    placeholder="Ask anything about this subject..."
                                    className="w-full max-h-32 min-h-[44px] bg-transparent outline-none resize-none py-3 text-text-main placeholder-text-muted/50 custom-scrollbar"
                                    rows="1"
                                />
                                <div className="flex gap-2 shrink-0 pb-1 pr-1">
                                    <button
                                        type="button"
                                        onClick={handleCreateFlashcard}
                                        disabled={generatingFlashcard || messages.length < 2}
                                        title="Create Flashcard from Context"
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-50 ${flashcardSuccess ? 'bg-amber-500/20 text-amber-500' : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-primary'}`}
                                    >
                                        <span className={`material-symbols-outlined text-xl ${generatingFlashcard ? 'animate-spin' : ''}`}>
                                            {generatingFlashcard ? 'sync' : flashcardSuccess ? 'check' : 'style'}
                                        </span>
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white disabled:opacity-50 transition-all shadow-md shadow-primary/30"
                                    >
                                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                                    </button>
                                </div>
                            </form>
                            <div className="text-center mt-2">
                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">AI Tutor generates personalized responses. Check facts if unsure.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
