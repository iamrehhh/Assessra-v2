// Next.js API route: /api/mark
// This proxies marking requests to the Flask AI backend (app.py on Render)
// In Phase 3, this will be replaced by a direct DB-backed AI call using the OpenAI SDK

export async function POST(request) {
    try {
        const body = await request.json();

        // For now, forward to the existing Flask backend on Render
        // Replace this URL with your Render/backend URL
        const BACKEND_URL = process.env.BACKEND_URL || 'https://assessra.onrender.com';

        const res = await fetch(`${BACKEND_URL}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000), // 60s timeout
        });

        if (!res.ok) {
            throw new Error(`Backend returned ${res.status}`);
        }

        const data = await res.json();
        return Response.json(data);
    } catch (err) {
        return Response.json(
            { error: 'Failed to connect to AI backend. Please try again.', detail: err.message },
            { status: 500 }
        );
    }
}
