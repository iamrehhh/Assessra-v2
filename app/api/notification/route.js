import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET /api/notification - fetch the active global notification
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', 1)
            .single();

        // PGRST116 means no rows returned (which is fine if table is empty)
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching notification:', error);
            return NextResponse.json({ active: false, message: '' }, { status: 200 });
        }

        return NextResponse.json({
            active: data?.active || false,
            message: data?.message || ''
        }, { status: 200 });
    } catch (e) {
        console.error('Notification API Error:', e);
        return NextResponse.json({ active: false, message: '' }, { status: 500 });
    }
}
