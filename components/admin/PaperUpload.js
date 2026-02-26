'use client';

import { useState, useRef } from 'react';

// ─── Subject and level options ──────────────────────────────────────────────
const SUBJECTS = [
    'Biology', 'Chemistry', 'Physics', 'Economics',
    'Business', 'History', 'English', 'Maths', 'General Paper'
];
const LEVELS = ['IGCSE', 'A Level'];
const DOC_TYPES = ['Past Paper', 'Mark Scheme', 'Textbook'];

export default function PaperUpload() {
    // Form state
    const [files, setFiles] = useState([]);
    const [subject, setSubject] = useState('Economics');
    const [level, setLevel] = useState('A Level');
    const [year, setYear] = useState('2024');
    const [docType, setDocType] = useState('Past Paper');

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [fileStatuses, setFileStatuses] = useState({}); // { filename: { status, message, chunks } }
    const [history, setHistory] = useState([]);

    const fileInputRef = useRef(null);

    // ── Handle file selection ────────────────────────────────────────
    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files || []);
        setFiles(selected);
        // Reset statuses when new files selected
        setFileStatuses({});
    };

    // ── Auto-detect year from Cambridge filename (e.g. 9708_s24_qp_41 → 2024) ─
    const detectYear = (filename) => {
        const match = filename.match(/[_-]([smw])(\d{2})[_-]/i);
        if (match) {
            const yy = parseInt(match[2], 10);
            return String(yy >= 90 ? 1900 + yy : 2000 + yy);
        }
        return year; // fallback to manual field
    };

    // ── Upload all selected files ────────────────────────────────────
    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);

        const typeValue = docType === 'Textbook' ? 'textbook' : docType === 'Mark Scheme' ? 'markscheme' : 'paper';
        const subjectValue = subject.toLowerCase().replace(' ', '_');
        const levelValue = level === 'A Level' ? 'alevel' : 'igcse';

        for (const file of files) {
            setFileStatuses(prev => ({
                ...prev,
                [file.name]: { status: 'uploading', message: 'Uploading...', chunks: 0 }
            }));

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('subject', subjectValue);
                formData.append('level', levelValue);
                formData.append('year', detectYear(file.name));
                formData.append('type', typeValue);

                const res = await fetch('/api/ingest', {
                    method: 'POST',
                    headers: {
                        'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || '',
                    },
                    body: formData,
                });
                let data;
                try {
                    data = await res.json();
                } catch (parseError) {
                    if (res.status === 413) {
                        throw new Error('File is too large (Payload Too Large). Max size is ~50MB.');
                    }
                    throw new Error(`Server returned a non-JSON response (${res.status}). Ensure the file fits within size limits.`);
                }

                if (res.ok) {
                    const replacedMsg = data.replaced ? ' (replaced previous version)' : '';
                    setFileStatuses(prev => ({
                        ...prev,
                        [file.name]: {
                            status: 'success',
                            message: `Successfully ingested ${data.chunks} chunks${replacedMsg}`,
                            chunks: data.chunks,
                        }
                    }));
                    // Add to session history (newest first)
                    setHistory(prev => [{
                        filename: file.name,
                        subject,
                        level,
                        year,
                        type: docType,
                        chunks: data.chunks,
                        status: 'success',
                    }, ...prev]);
                } else {
                    setFileStatuses(prev => ({
                        ...prev,
                        [file.name]: {
                            status: 'error',
                            message: data.detail || data.error || 'Upload failed',
                            chunks: 0,
                        }
                    }));
                    setHistory(prev => [{
                        filename: file.name,
                        subject,
                        level,
                        year,
                        type: docType,
                        chunks: 0,
                        status: 'error',
                    }, ...prev]);
                }
            } catch (err) {
                setFileStatuses(prev => ({
                    ...prev,
                    [file.name]: {
                        status: 'error',
                        message: 'Network error: ' + err.message,
                        chunks: 0,
                    }
                }));
                setHistory(prev => [{
                    filename: file.name,
                    subject,
                    level,
                    year,
                    type: docType,
                    chunks: 0,
                    status: 'error',
                }, ...prev]);
            }
        }

        setUploading(false);
        // Reset file input but keep other fields for back-to-back uploads
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Styles (matching AdminView's inline style system) ────────────
    const s = {
        card: { background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: '24px' },
        sectionTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },
        formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' },
        label: { display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
        input: { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s', color: '#1e293b', background: '#fafafa', boxSizing: 'border-box' },
        select: { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', color: '#1e293b', background: '#fafafa', cursor: 'pointer', boxSizing: 'border-box' },
        uploadBtn: { padding: '12px 28px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--lime-primary, #22c55e)', color: 'white', boxShadow: '0 4px 12px rgba(34,197,94,0.3)', display: 'inline-flex', alignItems: 'center', gap: '8px' },
        uploadBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
        fileZone: { border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s', background: '#fafbfc', marginBottom: '16px' },
        fileZoneActive: { borderColor: 'var(--lime-primary, #22c55e)', background: '#f0fdf4' },
        pillSuccess: { display: 'inline-block', padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, background: '#dcfce7', color: '#166534' },
        pillError: { display: 'inline-block', padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, background: '#fef2f2', color: '#dc2626' },
        pillUploading: { display: 'inline-block', padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, background: '#eff6ff', color: '#2563eb' },
        table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0', background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
        th: { padding: '14px 18px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#fafbfc' },
        td: { padding: '14px 18px', fontSize: '0.9rem', color: '#334155', borderBottom: '1px solid #f1f5f9' },
    };

    return (
        <div>
            {/* Upload Form Card */}
            <div style={s.card}>
                <p style={s.sectionTitle}>📄 Upload Past Papers</p>

                {/* File Drop Zone */}
                <div
                    style={{
                        ...s.fileZone,
                        ...(files.length > 0 ? s.fileZoneActive : {}),
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    {files.length === 0 ? (
                        <div>
                            <p style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📁</p>
                            <p style={{ fontWeight: 600, color: '#64748b', margin: 0 }}>
                                Click to select PDF files
                            </p>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                You can select multiple files for batch upload
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontWeight: 600, color: '#1e293b', margin: '0 0 4px 0' }}>
                                {files.length} file{files.length > 1 ? 's' : ''} selected
                            </p>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                                {files.map(f => f.name).join(', ')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Form Fields */}
                <div style={s.formGrid}>
                    <div>
                        <label style={s.label}>Subject</label>
                        <select
                            style={s.select}
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        >
                            {SUBJECTS.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={s.label}>Level</label>
                        <select
                            style={s.select}
                            value={level}
                            onChange={e => setLevel(e.target.value)}
                        >
                            {LEVELS.map(lv => (
                                <option key={lv} value={lv}>{lv}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={s.label}>Year</label>
                        <input
                            type="number"
                            style={s.input}
                            value={year}
                            onChange={e => setYear(e.target.value)}
                            placeholder="e.g. 2024"
                            min="2000"
                            max="2030"
                        />
                    </div>
                    <div>
                        <label style={s.label}>Document Type</label>
                        <select
                            style={s.select}
                            value={docType}
                            onChange={e => setDocType(e.target.value)}
                        >
                            {DOC_TYPES.map(dt => (
                                <option key={dt} value={dt}>{dt}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Upload Button */}
                <button
                    style={{
                        ...s.uploadBtn,
                        ...(uploading || files.length === 0 ? s.uploadBtnDisabled : {}),
                    }}
                    disabled={uploading || files.length === 0}
                    onClick={handleUpload}
                    onMouseEnter={e => { if (!uploading && files.length > 0) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    {uploading ? (
                        <>
                            <span style={{
                                width: '16px', height: '16px',
                                border: '3px solid rgba(255,255,255,0.3)',
                                borderTop: '3px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                display: 'inline-block',
                            }} />
                            Uploading...
                        </>
                    ) : (
                        <>⬆ Upload & Ingest</>
                    )}
                </button>

                {/* Per-file status messages */}
                {Object.keys(fileStatuses).length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                        {Object.entries(fileStatuses).map(([name, info]) => (
                            <div key={name} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 14px', borderRadius: '10px', marginBottom: '6px',
                                background: info.status === 'success' ? '#f0fdf4' : info.status === 'error' ? '#fef2f2' : '#eff6ff',
                            }}>
                                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{name}</span>
                                <span style={
                                    info.status === 'success' ? s.pillSuccess
                                        : info.status === 'error' ? s.pillError
                                            : s.pillUploading
                                }>
                                    {info.message}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Session Upload History */}
            {history.length > 0 && (
                <div>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📋 Upload History (this session)
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={s.table}>
                            <thead>
                                <tr>
                                    <th style={s.th}>Filename</th>
                                    <th style={s.th}>Subject</th>
                                    <th style={s.th}>Level</th>
                                    <th style={s.th}>Year</th>
                                    <th style={s.th}>Type</th>
                                    <th style={s.th}>Chunks</th>
                                    <th style={s.th}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((entry, i) => (
                                    <tr key={i}
                                        style={{ transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        <td style={{ ...s.td, fontWeight: 600 }}>{entry.filename}</td>
                                        <td style={s.td}>{entry.subject}</td>
                                        <td style={s.td}>{entry.level}</td>
                                        <td style={s.td}>{entry.year}</td>
                                        <td style={s.td}>{entry.type}</td>
                                        <td style={{ ...s.td, fontWeight: 700 }}>{entry.chunks}</td>
                                        <td style={s.td}>
                                            <span style={entry.status === 'success' ? s.pillSuccess : s.pillError}>
                                                {entry.status === 'success' ? '✓ Done' : '✕ Failed'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
