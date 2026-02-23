// MongoDB singleton client — standard Next.js connection pattern
// Prevents creating new connections on every hot-reload in dev

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('Please add MONGODB_URI to your .env.local or Vercel environment variables.');
}

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
    // In dev, use a global variable so the client is reused across HMR
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // In production, create a new client per cold start
    client = new MongoClient(uri);
    clientPromise = client.connect();
}

export default clientPromise;

// Helper to get the `scores` collection directly
export async function getScoresCollection() {
    const client = await clientPromise;
    return client.db('assessra').collection('scores');
}
