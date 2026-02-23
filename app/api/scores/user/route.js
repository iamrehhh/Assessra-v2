// GET /api/scores/user?username=Abdul.Rehan
// Returns all score attempts for a specific user

import { getScoresCollection } from '@/lib/mongodb';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username');

        if (!username) {
            return Response.json({ error: 'username query param required.' }, { status: 400 });
        }

        const collection = await getScoresCollection();

        const attempts = await collection
            .find({ username })
            .sort({ submittedAt: -1 })
            .toArray();

        // Aggregate totals per subject
        const subjectTotals = {};
        let grandTotal = 0;
        let grandMax = 0;

        for (const a of attempts) {
            const s = a.subject || 'unknown';
            if (!subjectTotals[s]) subjectTotals[s] = { score: 0, maxMarks: 0, attempts: 0 };
            subjectTotals[s].score += a.score;
            subjectTotals[s].maxMarks += a.maxMarks;
            subjectTotals[s].attempts += 1;
            grandTotal += a.score;
            grandMax += a.maxMarks;
        }

        return Response.json({
            username,
            attempts,
            subjectTotals,
            grandTotal,
            grandMax,
            grandPercent: grandMax > 0 ? Math.round((grandTotal / grandMax) * 100) : 0,
        });
    } catch (err) {
        console.error('Scores fetch error:', err);
        return Response.json({ error: 'Failed to fetch scores.' }, { status: 500 });
    }
}
