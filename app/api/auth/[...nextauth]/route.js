import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        CredentialsProvider({
            name: 'Email',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const { email, password } = credentials || {};
                if (!email || !password) return null;

                try {
                    const client = await clientPromise;
                    const db = client.db('assessra');

                    const user = await db.collection('users').findOne({
                        email: email.toLowerCase().trim(),
                        password: { $exists: true }, // only match credential users
                    });

                    if (!user) return null;

                    const isValid = await bcrypt.compare(password, user.password);
                    if (!isValid) return null;

                    return {
                        id: user._id.toString(),
                        name: user.name,
                        email: user.email,
                        image: user.image || '',
                    };
                } catch (error) {
                    console.error('Credentials authorize error:', error);
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.name = user.name;
                token.email = user.email;
                token.picture = user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                session.user.id = token.sub;
                session.user.username = session.user.name;
            }
            return session;
        },
    },
    pages: {
        signIn: '/',
        error: '/',
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
