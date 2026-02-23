'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

const medals = ['🥇', '🥈', '🥉'];

const subjectLabels = {
    'business-p3': 'Biz P3',
    'business-p4': 'Biz P4',
    'economics-p4': 'Econ P4',
    'economics-p3': 'Econ P3',
    'general-p1': 'GP1',
};

export default function LeaderboardView() {
    const { data: session } = useSession();
    const currentUser = session?.user?.email;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/leaderboard')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => { setError('Failed to load leaderboard.'); setLoading(false); });
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>⏳ Loading leaderboard...</div>;
    if (error) return <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>{error}</div>;
    if (!data?.leaderboard?.length) return (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>
            <p style={{ fontSize: '1.3rem' }}>📭 No scores yet — be the first on the board!</p>
        </div>
    );

    const board = data.leaderboard;

    return (
        <div>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '2rem', color: 'var(--lime-dark)', fontFamily: 'var(--font-playfair)' }}>🏆 Leaderboard</h2>
                <p style={{ color: '#666' }}>Top students ranked by total marks earned</p>
            </div>

            {/* Top 3 podium cards */}
            {board.length >= 3 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '40px', flexWrap: 'wrap', alignItems: 'flex-end', height: '240px' }}>
                    {[board[1], board[0], board[2]].map((player, i) => {
                        if (!player) return null;
                        const realRank = i === 0 ? 1 : i === 1 ? 0 : 2;
                        const heights = ['160px', '200px', '140px'];
                        const isMe = player._id === currentUser;

                        const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';
                        const displayName = player.nickname || player.name || player._id.split('@')[0];

                        return (
                            <div key={player._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
                                {/* Avatar Bubble */}
                                <div style={{
                                    width: realRank === 0 ? '60px' : '50px',
                                    height: realRank === 0 ? '60px' : '50px',
                                    borderRadius: '50%',
                                    marginBottom: '10px',
                                    background: player.image ? `url(${player.image}) center/cover` : 'var(--lime-primary)',
                                    color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: realRank === 0 ? '1.5rem' : '1.2rem', fontWeight: 800,
                                    border: `3px solid ${realRank === 0 ? '#f59e0b' : realRank === 1 ? '#94a3b8' : '#cd7c2f'}`,
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                    zIndex: 2
                                }}>
                                    {!player.image && getInitials(displayName)}
                                </div>

                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#555', marginBottom: '6px', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {displayName}
                                </div>
                                <div style={{ width: '100%', height: heights[i], background: isMe ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #64748b, #475569)', borderRadius: '10px 10px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '15px', color: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', position: 'relative' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '5px' }}>{medals[realRank]}</div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{player.totalScore}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Full rankings table */}
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 80px 80px', padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span>#</span>
                    <span>Student</span>
                    <span style={{ textAlign: 'right' }}>Total Marks</span>
                    <span style={{ textAlign: 'right' }}>Avg %</span>
                    <span style={{ textAlign: 'right' }}>Attempts</span>
                </div>

                {board.map((player, idx) => {
                    const isMe = player._id === currentUser;
                    const rank = idx + 1;
                    return (
                        <div key={player._id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 80px 80px', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: isMe ? '#f0fdf4' : 'white', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: rank <= 3 ? ['#f59e0b', '#94a3b8', '#cd7c2f'][rank - 1] : '#94a3b8', fontSize: rank <= 3 ? '1.2rem' : '0.95rem' }}>
                                {rank <= 3 ? medals[rank - 1] : rank}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                    background: player.image ? `url(${player.image}) center/cover` : '#e2e8f0',
                                    color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1rem', fontWeight: 700
                                }}>
                                    {!player.image && (player.nickname ? player.nickname.charAt(0).toUpperCase() : player._id.charAt(0).toUpperCase())}
                                </div>
                                <div>
                                    <div style={{ fontWeight: isMe ? 800 : 700, color: isMe ? 'var(--lime-dark)' : '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {player.nickname || player.name || player._id.split('@')[0]}
                                        {player.level && <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{player.level}</span>}
                                        {isMe && <span style={{ fontSize: '0.75rem', color: 'var(--lime-primary)' }}>(you)</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                        {player.subjects?.map(s => subjectLabels[s] || s).join(' · ')}
                                    </div>
                                </div>
                            </div>
                            <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--lime-dark)' }}>{player.totalScore}</span>
                            <span style={{ textAlign: 'right' }}>
                                <span style={{ background: player.percentage >= 70 ? '#dcfce7' : player.percentage >= 50 ? '#fef9c3' : '#fee2e2', color: player.percentage >= 70 ? '#16a34a' : player.percentage >= 50 ? '#ca8a04' : '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                                    {player.percentage}%
                                </span>
                            </span>
                            <span style={{ textAlign: 'right', color: '#64748b', fontSize: '0.9rem' }}>{player.totalAttempts}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
