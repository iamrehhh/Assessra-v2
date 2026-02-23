import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectMongo from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectMongo();

        // Find or create user
        let user = await User.findOne({ email: session.user.email });

        if (!user) {
            user = await User.create({
                email: session.user.email,
                name: session.user.name || '',
                image: session.user.image || '',
                isOnboarded: false
            });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('API /api/user GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();

        // We only allow updating nickname, level, image, and isOnboarded
        const updateData = {};
        if (data.nickname !== undefined) updateData.nickname = data.nickname;
        if (data.level !== undefined) updateData.level = data.level;
        if (data.image !== undefined) updateData.image = data.image; // Assume client sends Base64 for custom
        if (data.isOnboarded !== undefined) updateData.isOnboarded = data.isOnboarded;

        await connectMongo();

        const user = await User.findOneAndUpdate(
            { email: session.user.email },
            { $set: updateData },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('API /api/user POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
