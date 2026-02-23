// POST /api/scores/save
// Saves a paper attempt score to MongoDB

import { getScoresCollection } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { paperId, paperTitle, subject, questionNumber, score, maxMarks } = body;
        const username = session.user.email; // Force use of authenticated email

        if (!paperId || score === undefined || !maxMarks) {
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
