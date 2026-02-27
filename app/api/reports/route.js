import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import supabase from '@/lib/supabase';

const ADMIN_EMAILS = ['abdulrehanoffical@gmail.com', 'willdexter98@gmail.com'];

// GET — fetch reports (admin: all, user: own)
export async function GET(req) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const isAdmin = ADMIN_EMAILS.includes(session.user.email);
        const userOnly = searchParams.get('mine') === 'true';

        let query = supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        // Non-admins can only see their own reports
        if (!isAdmin || userOnly) {
            query = query.eq('user_email', session.user.email);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ reports: data || [] });
    } catch (err) {
        console.error('GET /api/reports error:', err);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

// POST — create a new report
export async function POST(req) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { category, page, description } = body;

        if (!description || !description.trim()) {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('reports')
            .insert({
                user_email: session.user.email,
                user_name: session.user.name || session.user.email,
                category: category || 'other',
                page: page || 'unknown',
                description: description.trim(),
                status: 'open',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ report: data });
    } catch (err) {
        console.error('POST /api/reports error:', err);
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }
}

// PATCH — update report status/reply (admin only)
export async function PATCH(req) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { id, status, admin_reply } = body;

        if (!id) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }

        const updates = {};
        if (status) updates.status = status;
        if (admin_reply !== undefined) updates.admin_reply = admin_reply;

        const { data, error } = await supabase
            .from('reports')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ report: data });
    } catch (err) {
        console.error('PATCH /api/reports error:', err);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }
}
