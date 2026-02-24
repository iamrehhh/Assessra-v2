'use client';

import { useState, useEffect } from 'react';

export default function AdminView() {
    const [tab, setTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (tab === 'users') fetchUsers();
        else fetchScores();
    }, [tab]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            setUsers(data.users || []);
        } catch { setUsers([]); }
        setLoading(false);
    };

    const fetchScores = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/scores');
            const data = await res.json();
            setScores(data.scores || []);
        } catch { setScores([]); }
        setLoading(false);
    };

    const deleteUser = async (id, email) => {
        if (!confirm(`Permanently delete user "${email}" and all their scores?`)) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== id));
                setScores(prev => prev.filter(s => s.username !== email));
            } else {
                const d = await res.json();
                alert(d.error || 'Failed to delete user.');
            }
        } catch { alert('Network error.'); }
        setActionLoading(null);
    };

    const resetScores = async (email) => {
        if (!confirm(`Reset ALL scores for "${email}"? This cannot be undone.`)) return;
        setActionLoading(email);
        try {
            const res = await fetch(`/api/admin/scores?username=${encodeURIComponent(email)}`, { method: 'DELETE' });
            if (res.ok) {
                setScores(prev => prev.filter(s => s.username !== email));
            } else {
                const d = await res.json();
                alert(d.error || 'Failed to reset scores.');
            }
        } catch { alert('Network error.'); }
        setActionLoading(null);
    };

    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.nickname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Aggregate scores by user
    const scoresByUser = {};
    for (const s of scores) {
        if (!scoresByUser[s.username]) {
            scoresByUser[s.username] = { email: s.username, nickname: s.userNickname, name: s.userName, totalScore: 0, totalMax: 0, attempts: 0, subjects: new Set() };
        }
        const u = scoresByUser[s.username];
        u.totalScore += s.score;
        u.totalMax += s.maxMarks;
        u.attempts += 1;
        u.subjects.add(s.subject);
    }
    let scoreAggregated = Object.values(scoresByUser).map(u => ({
        ...u,
        subjects: Array.from(u.subjects),
        percentage: u.totalMax > 0 ? Math.round((u.totalScore / u.totalMax) * 100) : 0,
    })).sort((a, b) => b.totalScore - a.totalScore);

    const filteredScores = scoreAggregated.filter(u =>
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.nickname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const styles = {
        container: { maxWidth: '1100px', margin: '0 auto' },
        header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' },
        title: { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.5px' },
        badge: { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
        tabs: { display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '24px', width: 'fit-content' },
        tab: (active) => ({ padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: active ? 'white' : 'transparent', color: active ? '#1e293b' : '#64748b', boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }),
        searchBar: { width: '100%', padding: '12px 18px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.95rem', marginBottom: '20px', outline: 'none', transition: 'border 0.2s', background: '#fafafa' },
        table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0', background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
        th: { padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#fafbfc' },
        td: { padding: '14px 18px', fontSize: '0.9rem', color: '#334155', borderBottom: '1px solid #f1f5f9' },
        avatar: (img) => ({ width: '36px', height: '36px', borderRadius: '50%', background: img ? `url(${img}) center/cover` : 'linear-gradient(135deg, #3b9c5a, #2d7a46)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px', flexShrink: 0 }),
        pill: (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, background: color === 'green' ? '#dcfce7' : color === 'orange' ? '#fff7ed' : '#f1f5f9', color: color === 'green' ? '#166534' : color === 'orange' ? '#9a3412' : '#475569' }),
        dangerBtn: { padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' },
        statsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
        statCard: { flex: 1, minWidth: '160px', background: 'white', borderRadius: '14px', padding: '18px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
        statNumber: { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: 0 },
        statLabel: { fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' },
        emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>Admin Panel</h1>
                <span style={styles.badge}>Admin Access</span>
            </div>

            {/* Stats */}
            <div style={styles.statsRow}>
                <div style={styles.statCard}>
                    <p style={styles.statLabel}>Total Users</p>
                    <p style={styles.statNumber}>{users.length}</p>
                </div>
                <div style={styles.statCard}>
                    <p style={styles.statLabel}>Total Score Entries</p>
                    <p style={styles.statNumber}>{scores.length}</p>
                </div>
                <div style={styles.statCard}>
                    <p style={styles.statLabel}>Active Scorers</p>
                    <p style={styles.statNumber}>{Object.keys(scoresByUser).length}</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                <button style={styles.tab(tab === 'users')} onClick={() => { setTab('users'); setSearchTerm(''); }}>
                    👥 Users
                </button>
                <button style={styles.tab(tab === 'scores')} onClick={() => { setTab('scores'); setSearchTerm(''); }}>
                    📊 Scores
                </button>
            </div>

            {/* Search */}
            <input
                type="text"
                style={styles.searchBar}
                placeholder={tab === 'users' ? 'Search by name, email, or nickname...' : 'Search by email or nickname...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loading ? (
                <div style={styles.emptyState}>
                    <div style={{ width: '36px', height: '36px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--lime-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
                    <p style={{ fontWeight: 600 }}>Loading...</p>
                </div>
            ) : tab === 'users' ? (
                /* Users Table */
                filteredUsers.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</p>
                        <p style={{ fontWeight: 600 }}>No users found</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>User</th>
                                    <th style={styles.th}>Email</th>
                                    <th style={styles.th}>Nickname</th>
                                    <th style={styles.th}>Level</th>
                                    <th style={styles.th}>Provider</th>
                                    <th style={styles.th}>Joined</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} style={{ transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={styles.avatar(user.image)}>
                                                    {!user.image && (user.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{user.name || '—'}</span>
                                            </div>
                                        </td>
                                        <td style={{ ...styles.td, fontSize: '0.85rem', color: '#64748b' }}>{user.email}</td>
                                        <td style={styles.td}>{user.nickname || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                                        <td style={styles.td}>
                                            {user.level ? <span style={styles.pill('green')}>{user.level}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={styles.pill(user.provider === 'google' ? 'orange' : 'gray')}>
                                                {user.provider || 'google'}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, fontSize: '0.82rem', color: '#94a3b8' }}>
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td style={styles.td}>
                                            {user.email !== 'abdulrehanoffical@gmail.com' ? (
                                                <button
                                                    style={{ ...styles.dangerBtn, opacity: actionLoading === user.id ? 0.5 : 1 }}
                                                    disabled={actionLoading === user.id}
                                                    onClick={() => deleteUser(user.id, user.email)}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                                                >
                                                    {actionLoading === user.id ? 'Deleting...' : 'Remove'}
                                                </button>
                                            ) : (
                                                <span style={styles.pill('green')}>Admin</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                /* Scores Table */
                filteredScores.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</p>
                        <p style={{ fontWeight: 600 }}>No scores found</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>User</th>
                                    <th style={styles.th}>Nickname</th>
                                    <th style={styles.th}>Total Score</th>
                                    <th style={styles.th}>Percentage</th>
                                    <th style={styles.th}>Attempts</th>
                                    <th style={styles.th}>Subjects</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredScores.map(entry => (
                                    <tr key={entry.email} style={{ transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                        <td style={styles.td}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{entry.name || entry.email}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{entry.email}</div>
                                            </div>
                                        </td>
                                        <td style={styles.td}>{entry.nickname || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                                        <td style={styles.td}>
                                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{entry.totalScore}</span>
                                            <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}> / {entry.totalMax}</span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.pill(entry.percentage >= 70 ? 'green' : entry.percentage >= 40 ? 'orange' : 'gray'),
                                                fontSize: '0.85rem',
                                            }}>
                                                {entry.percentage}%
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, fontWeight: 600 }}>{entry.attempts}</td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {entry.subjects.map(s => (
                                                    <span key={s} style={styles.pill('gray')}>{s}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                style={{ ...styles.dangerBtn, opacity: actionLoading === entry.email ? 0.5 : 1 }}
                                                disabled={actionLoading === entry.email}
                                                onClick={() => resetScores(entry.email)}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                                            >
                                                {actionLoading === entry.email ? 'Resetting...' : 'Reset Scores'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
