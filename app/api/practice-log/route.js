// app/api/practice-log/route.js
// POST endpoint to log AI practice sessions to Supabase

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import supabase from '@/lib/supabase';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { subject, level, topic, questionType, difficulty, marks, score, hasDiagram } = body;

        const userEmail = session.user.email;
        const userName = session.user.name || null;

        if (!subject || !level || !topic || !questionType) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        const { error } = await supabase.from('practice_logs').insert({
            user_email: userEmail,
            user_name: userName,
            subject,
            level,
            topic,
            question_type: questionType,
            difficulty: difficulty || null,
            marks: marks ? parseInt(marks, 10) : null,
            score: score !== undefined ? parseInt(score, 10) : null,
            has_diagram: !!hasDiagram
        });

        if (error) {
            console.error('Practice log insert error:', error);
            // We return 200 even on error so we don't break the frontend flow if analytics fails
            return NextResponse.json({ success: false, error: 'Failed to save practice log.' });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Practice log error:', err);
        return NextResponse.json({ success: false, error: 'Failed to save practice log.' });
    }
}
