// app/api/admin/practice/route.js
// GET endpoint to fetch AI practice logs for the admin panel

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import supabase from '@/lib/supabase';

const ADMIN_EMAILS = ['abdulrehanoffical@gmail.com', 'willdexter98@gmail.com'];

async function verifyAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
        return null;
    }
    return session;
}

export async function GET() {
    try {
        const session = await verifyAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: logs, error } = await supabase
            .from('practice_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Admin practice logs fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch practice logs.' }, { status: 500 });
        }

        return NextResponse.json({ logs: logs || [] });
    } catch (err) {
        console.error('Admin practice logs API error:', err);
        return NextResponse.json({ error: 'Failed to fetch logs.' }, { status: 500 });
    }
}
