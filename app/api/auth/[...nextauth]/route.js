// NextAuth configuration for Assessra-v2
// Supports:
//   1. Credentials (username/password) — mirrors current login behaviour
//   2. Google OAuth — new in Phase 3, allows anyone to sign up with Google

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { ALLOWED_USERS } from '@/lib/users';

export const authOptions = {
    providers: [
        // --- Google Sign-In ---
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),

        // --- Username/Password (existing users) ---
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const { username, password } = credentials || {};
                if (ALLOWED_USERS[username] && ALLOWED_USERS[username] === password) {
                    return { id: username, name: username, email: `${username.toLowerCase()}@assessra.local` };
                }
                return null;
            },
        }),
    ],

    session: {
        strategy: 'jwt',
    },

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.username = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.username = token.username;
            return session;
        },
    },

    pages: {
        signIn: '/',   // Use our custom login page
        error: '/',
    },

    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
