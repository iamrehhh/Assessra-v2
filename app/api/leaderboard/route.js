// GET /api/leaderboard
// Returns top 20 users ranked by total score

import { getScoresCollection } from '@/lib/mongodb';

export async function GET() {
    try {
        const collection = await getScoresCollection();

        // Aggregate total score per user
        const leaderboard = await collection.aggregate([
            {
                $group: {
                    _id: '$username',
                    totalScore: { $sum: '$score' },
                    totalMax: { $sum: '$maxMarks' },
                    totalAttempts: { $sum: 1 },
                    subjects: { $addToSet: '$subject' },
                    lastActivity: { $max: '$submittedAt' },
                },
            },
            {
                $addFields: {
                    percentage: {
                        $cond: [
                            { $gt: ['$totalMax', 0] },
                            { $round: [{ $multiply: [{ $divide: ['$totalScore', '$totalMax'] }, 100] }, 0] },
                            0,
                        ],
                    },
                },
            },
            { $sort: { totalScore: -1 } },
            { $limit: 20 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "email",
                    as: "userInfo"
                }
            },
            {
                $unwind: {
                    path: "$userInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    totalScore: 1,
                    totalMax: 1,
                    totalAttempts: 1,
                    subjects: 1,
                    lastActivity: 1,
                    percentage: 1,
                    nickname: "$userInfo.nickname",
                    image: "$userInfo.image",
                    level: "$userInfo.level"
                }
            }
        ]).toArray();

        return Response.json({ leaderboard });
    } catch (err) {
        console.error('Leaderboard error:', err);
        return Response.json({ error: 'Failed to fetch leaderboard.' }, { status: 500 });
    }
}
