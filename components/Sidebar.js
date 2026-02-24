'use client';

const ADMIN_EMAILS = ['abdulrehanoffical@gmail.com', 'willdexter98@gmail.com'];

export default function Sidebar({ view, setView, userEmail, currentGoal = 5, completedGoal = 4 }) {
    const isAdmin = ADMIN_EMAILS.includes(userEmail);

    const goalPercent = Math.min(100, Math.round((completedGoal / currentGoal) * 100)) || 0;

    const navItems = [
        { id: 'home', icon: 'grid_view', label: 'Overview' },
        { id: 'papers', icon: 'book', label: 'Subjects' },
        { id: 'formulae', icon: 'function', label: 'Formulae' },
        { id: 'definitions', icon: 'menu_book', label: 'Definitions' },
        { id: 'scorecard', icon: 'bar_chart', label: 'Scorecard' },
        { id: 'leaderboard', icon: 'leaderboard', label: 'Leaderboard' },
    ];

    return (
        <aside className="w-64 border-r border-white/5 flex flex-col bg-background-dark hidden lg:flex shrink-0">
            <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-background-dark font-bold">bolt</span>
                </div>
                <h1 className="text-xl font-black tracking-tighter uppercase italic text-slate-100 m-0 leading-none">Assessra</h1>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                {navItems.map(item => {
                    const isActive = view === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                                }`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </button>
                    );
                })}

                {isAdmin && (
                    <button
                        onClick={() => setView('admin')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-4 ${view === 'admin'
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "text-red-400/80 hover:bg-white/5 hover:text-red-400 border border-transparent"
                            }`}
                    >
                        <span className="material-symbols-outlined">admin_panel_settings</span>
                        <span className="font-medium uppercase tracking-wide text-sm font-bold">Admin</span>
                    </button>
                )}
            </nav>

            <div className="p-4 border-t border-white/5 mt-auto">
                <div className="glass-primary rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-300 mb-1">Daily Goal Progress</p>
                    <p className="text-xs text-slate-400 mb-2">{completedGoal}/{currentGoal} Modules Complete</p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${goalPercent}%` }}></div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
