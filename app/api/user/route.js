import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db('assessra');

        // Find user
        let user = await db.collection('users').findOne({ email: session.user.email });

        if (!user) {
            // Create user if doesn't exist
            const newUser = {
                email: session.user.email,
                name: session.user.name || '',
                image: session.user.image || '',
                nickname: '',
                level: '',
                isOnboarded: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await db.collection('users').insertOne(newUser);
            user = newUser;
        }

        // don't send _id to client if it's an ObjectId, or let Next.js serialize it (can be tricky)
        // safe to just return user
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
        const updateData = { updatedAt: new Date() };
        if (data.nickname !== undefined) updateData.nickname = data.nickname;
        if (data.level !== undefined) updateData.level = data.level;
        if (data.image !== undefined) updateData.image = data.image; // Assume client sends Base64 for custom
        if (data.isOnboarded !== undefined) updateData.isOnboarded = data.isOnboarded;

        const client = await clientPromise;
        const db = client.db('assessra');

        const result = await db.collection('users').findOneAndUpdate(
            { email: session.user.email },
            { $set: updateData },
            { returnDocument: 'after', upsert: true }
        );

        return NextResponse.json({ success: true, user: result.value || result });
    } catch (error) {
        console.error('API /api/user POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
