'use client';

import { paperListings } from '@/data/index';
import { allPaperData } from '@/data/index';
import PaperView from '../PaperView';
import { useState } from 'react';

const subjectTitles = {
    'business-p3': { emoji: '💼', title: 'Business: Paper 3', subtitle: 'Business Decision-Making', paperLabel: 'Paper 3' },
    'business-p4': { emoji: '💼', title: 'Business: Paper 4', subtitle: 'Business Strategy', paperLabel: 'Paper 4' },
    'economics-p3': { emoji: '📈', title: 'Economics: Paper 3', subtitle: 'Multiple Choice', paperLabel: 'Paper 3' },
    'economics-p4': { emoji: '📈', title: 'Economics: Paper 4', subtitle: 'Data Response & Essays', paperLabel: 'Paper 4' },
    'general-p1': { emoji: '🌍', title: 'General Paper 1', subtitle: 'Essay Questions', paperLabel: 'Paper 1' },
    'general-p2': { emoji: '🌍', title: 'General Paper 2', subtitle: 'Data Response', paperLabel: 'Paper 2' },
};

export default function PapersView({ subject, paper, onBack }) {
    const [openPaperId, setOpenPaperId] = useState(null);
    const key = `${subject}-${paper}`;
    const meta = subjectTitles[key] || { emoji: '📄', title: 'Papers', subtitle: '', paperLabel: 'Paper' };
    const papers = paperListings[key] || [];

    // If a paper is open, show full PaperView
    if (openPaperId) {
        return (
            <PaperView
                paperId={openPaperId}
                paperData={allPaperData}
                onBack={() => setOpenPaperId(null)}
            />
        );
    }

    // Group by year + series
    const grouped = papers.reduce((acc, p) => {
        const groupKey = `${p.year}|||${p.series}`;
        if (!acc[groupKey]) acc[groupKey] = { year: p.year, series: p.series, papers: [] };
        acc[groupKey].papers.push(p);
        return acc;
    }, {});

    return (
        <div>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '2rem', color: 'var(--lime-dark)', fontFamily: 'var(--font-playfair)' }}>
                    {meta.emoji} {meta.title}
                </h2>
                <p style={{ color: '#666' }}>{meta.subtitle}</p>
            </div>

            {papers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>
                    <p style={{ fontSize: '1.2rem' }}>📂 Papers coming soon for this section.</p>
                </div>
            ) : (
                Object.values(grouped).map((group) => (
                    <div key={`${group.year}-${group.series}`}>
                        <div className="series-header">
                            <div className="year-big">{group.year}</div>
                            <div className="series-name">{group.series}</div>
                        </div>
                        <div className="papers-grid">
                            {group.papers.map((p) => (
                                <div
                                    key={p.id}
                                    className="paper-card"
                                    onClick={() => setOpenPaperId(p.id)}
                                >
                                    <span className="paper-tag">{p.code}</span>
                                    <h3 style={{ marginTop: '8px', fontFamily: 'var(--font-playfair)', color: '#1e293b' }}>{p.title}</h3>
                                    <p style={{ color: '#888', marginTop: '5px', fontSize: '0.9rem' }}>
                                        {meta.paperLabel} • PDF Available
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
