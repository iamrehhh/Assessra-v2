'use client';

import { useState } from 'react';
import AITutorChat from '../AITutorChat';

export default function AITutorView({ subject, setView }) {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(subject || null);

    const levels = [
        { id: 'igcse', title: 'IGCSE', icon: 'school', desc: 'Grades 9-10' },
        { id: 'as-a-level', title: 'AS & A Level', icon: 'account_balance', desc: 'Grades 11-12' },
    ];

    const subjects = {
        'igcse': [
            { id: 'history', title: 'History', icon: 'history_edu', color: 'text-amber-500' },
        ],
        'as-a-level': [
            { id: 'business', title: 'Business', icon: 'business_center', color: 'text-blue-500' },
            { id: 'economics', title: 'Economics', icon: 'trending_up', color: 'text-emerald-500' },
        ]
    };

    if (selectedSubject) {
        return <AITutorChat subject={selectedSubject} level={selectedLevel} onBack={() => {
            setSelectedSubject(null);
            if (!selectedLevel) {
                // Determine level from subject if it wasn't selected (e.g. initial prop)
                if (subjects['igcse'].find(s => s.id === selectedSubject)) setSelectedLevel('igcse');
                else setSelectedLevel('as-a-level');
            }
        }} />;
    }

    return (
        <div className="max-w-5xl mx-auto animate-fade-in py-8 px-4">
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <span className="material-symbols-outlined text-5xl text-primary font-light">smart_toy</span>
                </div>
                <h1 className="text-5xl font-black text-text-main mb-4 font-serif italic tracking-tight">AI Tutor</h1>
                <p className="text-text-muted text-lg max-w-2xl mx-auto font-medium">Get personalized help, conceptual explanations, and revision materials tailored just for you.</p>
            </div>

            {!selectedLevel ? (
                <div>
                    <h3 className="text-xl font-bold text-text-main mb-6 text-center tracking-wide uppercase text-sm opacity-80">Select Your Level</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {levels.map(lvl => (
                            <button
                                key={lvl.id}
                                onClick={() => setSelectedLevel(lvl.id)}
                                className="glass p-10 rounded-[2.5rem] border border-border-main hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 group flex flex-col items-center justify-center gap-5 text-center shadow-lg hover:shadow-2xl"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                                    <span className="material-symbols-outlined text-4xl">{lvl.icon}</span>
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black text-text-main mb-2 tracking-tight">{lvl.title}</h4>
                                    <p className="text-text-muted text-base font-medium">{lvl.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => setSelectedLevel(null)}
                            className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h3 className="text-3xl font-black text-text-main tracking-tight">
                            Select Subject <span className="text-primary font-serif italic text-2xl px-2">for {levels.find(l => l.id === selectedLevel)?.title}</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {subjects[selectedLevel].map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => setSelectedSubject(sub.id)}
                                className="glass p-8 rounded-3xl border border-border-main hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 group flex flex-col items-center justify-center gap-4 text-center shadow-md hover:shadow-xl"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                    <span className={`material-symbols-outlined text-4xl ${sub.color}`}>{sub.icon}</span>
                                </div>
                                <h4 className="text-xl font-bold text-text-main tracking-tight">{sub.title}</h4>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
