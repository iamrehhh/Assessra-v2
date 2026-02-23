// POST /api/scores/save
// Saves a paper attempt score to MongoDB

import { getScoresCollection } from '@/lib/mongodb';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, paperId, paperTitle, subject, questionNumber, score, maxMarks } = body;

        if (!username || !paperId || score === undefined || !maxMarks) {
            return Response.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        const collection = await getScoresCollection();

        await collection.insertOne({
            username,
            paperId,
            paperTitle: paperTitle || paperId,
            subject: subject || 'unknown',
            questionNumber: questionNumber || 'all',
            score: Number(score),
            maxMarks: Number(maxMarks),
            percentage: Math.round((score / maxMarks) * 100),
            submittedAt: new Date(),
        });

        return Response.json({ success: true });
    } catch (err) {
        console.error('Score save error:', err);
        return Response.json({ error: 'Failed to save score.' }, { status: 500 });
    }
}
