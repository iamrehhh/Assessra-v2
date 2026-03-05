import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        const subject = searchParams.get('subject');

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        let query = supabase
            .from('ai_tutor_conversations')
            .select('*')
            .eq('user_email', email)
            .order('updated_at', { ascending: false });

        if (subject) {
            query = query.eq('subject', subject);
        }

        const { data: conversations, error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, subject, level, title } = body;

        if (!email || !subject || !level) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('ai_tutor_conversations')
            .insert({
                user_email: email,
                subject,
                level,
                title: title || 'New Conversation'
            })
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ conversation: data });
    } catch (error) {
        console.error('Error creating conversation:', error);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }
}
