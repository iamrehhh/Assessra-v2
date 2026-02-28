'use client';

import { useState, useEffect, useCallback } from 'react';
import PaperUpload from '@/components/admin/PaperUpload';

export default function AdminView() {
    const [tab, setTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [scores, setScores] = useState([]);
    const [practiceLogs, setPracticeLogs] = useState([]);
    const [activeUsersList, setActiveUsersList] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Reports modal state
    const [selectedReport, setSelectedReport] = useState(null);
    const [reportReply, setReportReply] = useState('');
    const [reportStatus, setReportStatus] = useState('open');
    const [savingReport, setSavingReport] = useState(false);
    const [deletingReport, setDeletingReport] = useState(false);

    // Notification State
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationActive, setNotificationActive] = useState(false);

    useEffect(() => {
        if (tab === 'users') fetchUsers();
        else if (tab === 'scores') fetchScores();
        else if (tab === 'practice') fetchPracticeLogs();
        else if (tab === 'active') fetchActiveUsers();
        else if (tab === 'reports') fetchReports();
        fetchNotification();
    }, [tab]);

    const fetchNotification = async () => {
        try {
            const res = await fetch('/api/notification');
            const data = await res.json();
            setNotificationMessage(data.message || '');
            setNotificationActive(data.active || false);
        } catch (err) { console.error('Failed to fetch notification', err); }
    };

    // Modal State
    const [modal, setModal] = useState({ open: false, type: 'alert', title: '', message: '', onConfirm: null });
    const [practiceModalOpen, setPracticeModalOpen] = useState(false);
    const [selectedUserLogs, setSelectedUserLogs] = useState(null);

    const showAlert = useCallback((title, message) => {
        setModal({ open: true, type: 'alert', title, message, onConfirm: null });
    }, []);

    const showConfirm = useCallback((title, message, onConfirm) => {
        setModal({ open: true, type: 'confirm', title, message, onConfirm });
    }, []);

    const closeModal = useCallback(() => {
        setModal(prev => ({ ...prev, open: false }));
    }, []);

    const saveNotification = async () => {
        try {
            const res = await fetch('/api/admin/notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: notificationMessage, active: notificationActive })
            });
            if (res.ok) showAlert('Success', 'Notification updated successfully!');
            else showAlert('Error', 'Failed to update notification.');
        } catch (err) { showAlert('Error', 'Network error.'); }
    };

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

    const fetchPracticeLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/practice');
            const data = await res.json();
            setPracticeLogs(data.practiceScores || []);
        } catch { setPracticeLogs([]); }
        setLoading(false);
    };

    const fetchActiveUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/active-users');
            const data = await res.json();
            setActiveUsersList(data.activeUsers || []);
        } catch { setActiveUsersList([]); }
        setLoading(false);
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports');
            const data = await res.json();
            setReports(data.reports || []);
        } catch { setReports([]); }
        setLoading(false);
    };

    const updateReport = async () => {
        if (!selectedReport) return;
        setSavingReport(true);
        try {
            const res = await fetch('/api/reports', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedReport.id,
                    status: reportStatus,
                    admin_reply: reportReply
                })
            });
            if (res.ok) {
                showAlert('Success', 'Report updated!');
                setSelectedReport(null);
                fetchReports();
            } else {
                showAlert('Error', 'Failed to update report.');
            }
        } catch { showAlert('Error', 'Network error.'); }
        setSavingReport(false);
    };

    const deleteReport = async (id) => {
        showConfirm('Delete Report', 'Permanently delete this error report? This action cannot be undone.', async () => {
            closeModal();
            setDeletingReport(true);
            try {
                const res = await fetch(`/api/reports?id=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setReports(prev => prev.filter(r => r.id !== id));
                    setSelectedReport(null);
                    showAlert('Success', 'Report deleted successfully.');
                } else {
                    const d = await res.json();
                    showAlert('Error', d.error || 'Failed to delete report.');
                }
            } catch { showAlert('Error', 'Network error.'); }
            setDeletingReport(false);
        });
    };

    const deleteUser = async (id, email) => {
        showConfirm('Delete User', `Permanently delete user "${email}" and all their scores?`, async () => {
            closeModal();
            setActionLoading(id);
            try {
                const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setUsers(prev => prev.filter(u => u.id !== id));
                    setScores(prev => prev.filter(s => s.username !== email));
                } else {
                    const d = await res.json();
                    showAlert('Error', d.error || 'Failed to delete user.');
                }
            } catch { showAlert('Error', 'Network error.'); }
            setActionLoading(null);
        });
    };

    const resetScores = async (email) => {
        showConfirm('Reset Scores', `Reset ALL scores for "${email}"? This cannot be undone.`, async () => {
            closeModal();
            setActionLoading(email);
            try {
                const res = await fetch(`/api/admin/scores?username=${encodeURIComponent(email)}`, { method: 'DELETE' });
                if (res.ok) {
                    setScores(prev => prev.filter(s => s.username !== email));
                } else {
                    const d = await res.json();
                    showAlert('Error', d.error || 'Failed to reset scores.');
                }
            } catch { showAlert('Error', 'Network error.'); }
            setActionLoading(null);
        });
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

    // Aggregate practice logs by user
    const practiceByUser = {};
    for (const log of practiceLogs) {
        if (!practiceByUser[log.user_email]) {
            practiceByUser[log.user_email] = {
                email: log.user_email,
                name: log.user_name || log.user_email,
                totalSessions: 0,
                totalScore: 0,
                totalMax: 0,
                subjects: new Set(),
                types: { multiple_choice: 0, structured: 0, essay: 0, data_response: 0 },
                lastActive: log.created_at,
                logs: []
            };
        }
        const u = practiceByUser[log.user_email];
        u.totalSessions += 1;
        u.totalScore += log.score || 0;
        u.totalMax += log.marks || 0;
        u.subjects.add(log.subject);
        if (log.question_type) u.types[log.question_type] = (u.types[log.question_type] || 0) + 1;
        if (new Date(log.created_at) > new Date(u.lastActive)) u.lastActive = log.created_at;
        u.logs.push(log);
    }
    let practiceAggregated = Object.values(practiceByUser).map(u => ({
        ...u,
        subjects: Array.from(u.subjects),
        percentage: u.totalMax > 0 ? Math.round((u.totalScore / u.totalMax) * 100) : 0,
        logs: u.logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    })).sort((a, b) => b.totalSessions - a.totalSessions);

    const filteredPractice = practiceAggregated.filter(u =>
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredActiveUsers = activeUsersList.filter(u =>
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const styles = {
        container: { maxWidth: '1100px', margin: '0 auto' },
        header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' },
        title: { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.5px' },
        badge: { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
        tabs: { display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '24px', width: 'fit-content' },
        tab: (active) => ({ padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: active ? 'white' : 'transparent', color: active ? '#1e293b' : '#64748b', boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }),
        searchBar: { width: '100%', padding: '12px 18px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.95rem', marginBottom: '20px', outline: 'none', transition: 'border 0.2s', background: '#fafafa', color: '#1e293b' },
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

        // Modal Styles
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
        modalContent: { background: '#1e293b', width: '90%', maxWidth: '420px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', paddingBottom: '4px' },
        modalHeader: { padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' },
        modalClose: { background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' },
        modalBody: { padding: '24px' },
        modalText: { margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' },
        modalFooter: { padding: '16px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)' },
        modalCancel: { padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
        modalDanger: { padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#e11d48', color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(225,29,72,0.3)' },
        modalPrimary: { padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'var(--lime-primary)', color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }
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
                    <p style={styles.statLabel}>AI Practice Sessions</p>
                    <p style={styles.statNumber}>{practiceLogs.length}</p>
                </div>
                <div style={styles.statCard}>
                    <p style={styles.statLabel}><span style={{ color: '#22c55e' }}>●</span> Active Now</p>
                    <p style={styles.statNumber}>{activeUsersList.length}</p>
                </div>
            </div>

            {/* Notification Control */}
            <div style={{ ...styles.statCard, marginBottom: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <p style={{ ...styles.statLabel, marginBottom: '4px' }}>Global Notification</p>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Broadcast a message to all users on the dashboard.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        value={notificationMessage}
                        onChange={e => setNotificationMessage(e.target.value)}
                        placeholder="Enter notification message..."
                        style={{ flex: 1, minWidth: '250px', padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', outline: 'none', transition: 'border 0.2s', fontSize: '0.95rem', color: '#1e293b', backgroundColor: 'white' }}
                        onFocus={e => e.target.style.borderColor = 'var(--lime-primary)'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', color: '#1e293b' }}>
                        <input
                            type="checkbox"
                            checked={notificationActive}
                            onChange={e => setNotificationActive(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--lime-primary)', cursor: 'pointer' }}
                        />
                        Active Status
                    </label>
                    <button
                        style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--lime-primary)', color: 'white', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}
                        onClick={saveNotification}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Publish Update
                    </button>
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
                <button style={styles.tab(tab === 'practice')} onClick={() => { setTab('practice'); setSearchTerm(''); }}>
                    🧠 AI Practice
                </button>
                <button style={styles.tab(tab === 'upload')} onClick={() => { setTab('upload'); setSearchTerm(''); }}>
                    📄 Upload Papers
                </button>
                <button style={styles.tab(tab === 'active')} onClick={() => { setTab('active'); setSearchTerm(''); }}>
                    <span style={{ color: '#22c55e' }}>●</span> Active
                </button>
                <button style={styles.tab(tab === 'reports')} onClick={() => { setTab('reports'); setSearchTerm(''); }}>
                    🚨 Reports
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

            {tab === 'upload' ? (
                <PaperUpload />
            ) : loading ? (
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
                                            {!['abdulrehanoffical@gmail.com', 'willdexter98@gmail.com'].includes(user.email) ? (
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
            ) : tab === 'scores' ? (
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
            ) : tab === 'practice' ? (
                /* AI Practice Table */
                filteredPractice.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🧠</p>
                        <p style={{ fontWeight: 600 }}>No practice logs found</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>User</th>
                                    <th style={styles.th}>Stats</th>
                                    <th style={styles.th}>Question Types</th>
                                    <th style={styles.th}>Last Active</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPractice.map(entry => (
                                    <tr key={entry.email} style={{ transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                        <td style={styles.td}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{entry.name || entry.email}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{entry.email}</div>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: 700, color: '#1e293b' }}>
                                                {entry.totalSessions} <span style={{ fontWeight: 500, color: '#64748b', fontSize: '0.85rem' }}>Sessions</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                                                {entry.subjects.slice(0, 3).map(s => (
                                                    <span key={s} style={{ ...styles.pill('gray'), fontSize: '0.7rem', padding: '2px 8px' }}>{s}</span>
                                                ))}
                                                {entry.subjects.length > 3 && (
                                                    <span style={{ ...styles.pill('gray'), fontSize: '0.7rem', padding: '2px 8px' }}>+{entry.subjects.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: '4px 12px', fontSize: '0.8rem', color: '#64748b' }}>
                                                {entry.types.multiple_choice > 0 && <div>MCQ: <span style={{ fontWeight: 600, color: '#334155' }}>{entry.types.multiple_choice}</span></div>}
                                                {entry.types.structured > 0 && <div>Structured: <span style={{ fontWeight: 600, color: '#334155' }}>{entry.types.structured}</span></div>}
                                                {entry.types.essay > 0 && <div>Essay: <span style={{ fontWeight: 600, color: '#334155' }}>{entry.types.essay}</span></div>}
                                                {entry.types.data_response > 0 && <div>Data: <span style={{ fontWeight: 600, color: '#334155' }}>{entry.types.data_response}</span></div>}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: 500, color: '#334155' }}>
                                                {new Date(entry.lastActive).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {new Date(entry.lastActive).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#3b82f6', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onClick={() => { setSelectedUserLogs(entry); setPracticeModalOpen(true); }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                            >
                                                View Logs
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : tab === 'active' ? (
                /* Active Users Table */
                filteredActiveUsers.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🟢</p>
                        <p style={{ fontWeight: 600 }}>No users currently active</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>User</th>
                                    <th style={styles.th}>Page</th>
                                    <th style={styles.th}>Last Seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredActiveUsers.map(user => (
                                    <tr key={user.email} style={{ transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ ...styles.avatar(user.image), position: 'relative' }}>
                                                    {!user.image && (user.name || '?').charAt(0).toUpperCase()}
                                                    <span style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, background: '#22c55e', border: '2px solid white', borderRadius: '50%' }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{user.name || 'Student'}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={styles.pill('green')}>
                                                {user.current_page || 'home'}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, fontSize: '0.85rem', color: '#64748b' }}>
                                            {(() => {
                                                const date = new Date(user.last_seen);
                                                const diff = Math.floor((new Date() - date) / 1000 / 60);
                                                return diff === 0 ? 'Just now' : `${diff} min ago`;
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : tab === 'reports' ? (
                /* Reports Table */
                reports.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🚨</p>
                        <p style={{ fontWeight: 600 }}>No reports yet</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>User</th>
                                    <th style={styles.th}>Category</th>
                                    <th style={styles.th}>Page</th>
                                    <th style={styles.th}>Description</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Date</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.filter(r =>
                                    (r.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (r.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (r.description || '').toLowerCase().includes(searchTerm.toLowerCase())
                                ).map(report => (
                                    <tr key={report.id} style={{ transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                        <td style={styles.td}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{report.user_name || 'Unknown'}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{report.user_email}</div>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={styles.pill(report.category === 'bug' ? 'orange' : 'gray')}>
                                                {(report.category || 'other').replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, fontSize: '0.85rem', color: '#64748b' }}>{report.page || '—'}</td>
                                        <td style={{ ...styles.td, maxWidth: '250px' }}>
                                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>
                                                {report.description}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.pill(
                                                    report.status === 'resolved' ? 'green' :
                                                        report.status === 'in_progress' ? 'orange' : 'gray'
                                                ),
                                                textTransform: 'capitalize'
                                            }}>
                                                {(report.status || 'open').replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, fontSize: '0.82rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                            {report.created_at ? new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#3b82f6', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onClick={() => {
                                                    setSelectedReport(report);
                                                    setReportReply(report.admin_reply || '');
                                                    setReportStatus(report.status || 'open');
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                            >
                                                {report.admin_reply ? 'View / Edit' : 'Reply'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : null}

            {/* Practice Drill-down Modal */}
            {practiceModalOpen && selectedUserLogs && (
                <div style={styles.modalOverlay} onClick={() => setPracticeModalOpen(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={styles.modalTitle}>Practice Sessions: {selectedUserLogs.name || selectedUserLogs.email}</h3>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>{selectedUserLogs.totalSessions} total sessions</p>
                            </div>
                            <button style={styles.modalClose} onClick={() => setPracticeModalOpen(false)}>✕</button>
                        </div>
                        <div style={{ padding: '0', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                            <table style={{ ...styles.table, borderRadius: 0, boxShadow: 'none' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#fafbfc', zIndex: 10 }}>
                                    <tr>
                                        <th style={styles.th}>Date</th>
                                        <th style={styles.th}>Subject/Level</th>
                                        <th style={styles.th}>Topic</th>
                                        <th style={styles.th}>Format</th>
                                        <th style={styles.th}>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedUserLogs.logs.map(log => (
                                        <tr key={log.id}>
                                            <td style={{ ...styles.td, fontSize: '0.8rem', color: '#64748b' }}>
                                                {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<br />
                                                {new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={styles.td}>
                                                <div style={{ fontWeight: 600, color: '#334155' }}>{log.subject}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>{log.level}</div>
                                            </td>
                                            <td style={{ ...styles.td, maxWidth: '200px' }}>
                                                <div style={{ fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {log.topic}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                                    {log.has_diagram && <span style={{ color: '#8b5cf6', fontWeight: 600 }}>📊 Included diagram</span>}
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <span style={styles.pill(log.question_type === 'multiple_choice' ? 'orange' : 'gray')}>
                                                    {log.question_type.replace('_', ' ')}
                                                </span>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', textTransform: 'capitalize' }}>
                                                    {log.difficulty}
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                {log.score !== null ? (
                                                    <div>
                                                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{log.score}</span>
                                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}> / {log.marks}</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontStyle: 'italic' }}>Unevaluated</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Detail / Reply Modal */}
            {selectedReport && (
                <div style={styles.modalOverlay} onClick={() => setSelectedReport(null)}>
                    <div style={{ ...styles.modalContent, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={styles.modalTitle}>Report from {selectedReport.user_name}</h3>
                                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>{selectedReport.user_email}</p>
                            </div>
                            <button style={styles.modalClose} onClick={() => setSelectedReport(null)}>✕</button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '60vh' }}>
                            {/* Report Info */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <span style={styles.pill(selectedReport.category === 'bug' ? 'orange' : 'gray')}>
                                    {(selectedReport.category || 'other').replace('_', ' ')}
                                </span>
                                <span style={styles.pill('gray')}>Page: {selectedReport.page || 'Unknown'}</span>
                                <span style={styles.pill('gray')}>
                                    {selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                            </div>

                            {/* Description */}
                            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                                <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>User's Description</p>
                                <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{selectedReport.description}</p>
                            </div>

                            {/* Status Select */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Status</label>
                                <select
                                    value={reportStatus}
                                    onChange={e => setReportStatus(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '0.95rem', color: '#1e293b', background: 'white', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                            </div>

                            {/* Reply Textarea */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Reply to User</label>
                                <textarea
                                    value={reportReply}
                                    onChange={e => setReportReply(e.target.value)}
                                    rows={4}
                                    placeholder="Type your reply to the user here..."
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '0.95rem', color: '#1e293b', background: 'white', outline: 'none', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                                />
                            </div>
                        </div>
                        <div style={{ ...styles.modalFooter, justifyContent: 'space-between' }}>
                            <div>
                                <button
                                    style={{ ...styles.modalDanger, opacity: deletingReport ? 0.6 : 1 }}
                                    onClick={() => deleteReport(selectedReport.id)}
                                    disabled={deletingReport}
                                >
                                    {deletingReport ? 'Deleting...' : 'Delete Report'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button style={styles.modalCancel} onClick={() => setSelectedReport(null)}>Cancel</button>
                                <button
                                    style={{ ...styles.modalPrimary, opacity: savingReport ? 0.6 : 1 }}
                                    onClick={updateReport}
                                    disabled={savingReport}
                                >
                                    {savingReport ? 'Saving...' : 'Save & Send Reply'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dark Modal */}
            {modal.open && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{modal.title}</h3>
                            <button style={styles.modalClose} onClick={closeModal}>✕</button>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={styles.modalText}>{modal.message}</p>
                        </div>
                        <div style={styles.modalFooter}>
                            {modal.type === 'confirm' && (
                                <button style={styles.modalCancel} onClick={closeModal}>
                                    Cancel
                                </button>
                            )}
                            <button
                                style={modal.type === 'confirm' ? styles.modalDanger : styles.modalPrimary}
                                onClick={() => {
                                    if (modal.onConfirm) modal.onConfirm();
                                    else closeModal();
                                }}
                            >
                                {modal.type === 'confirm' ? 'Confirm' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
