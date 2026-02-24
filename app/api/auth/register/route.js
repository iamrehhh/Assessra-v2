import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
    try {
        const { name, email, password } = await req.json();

        // Validate inputs
        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db('assessra');

        // Check if email already exists
        const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }

        // Hash password and store user
        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            image: '',
            nickname: '',
            level: '',
            isOnboarded: false,
            provider: 'credentials',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.collection('users').insertOne(newUser);

        return NextResponse.json({ success: true, message: 'Account created successfully.' });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
