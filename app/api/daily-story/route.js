import { NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';

export const revalidate = 86400; // Cache for 24 hours

const GENRES = [
    'Philosophical',
    'Motivating',
    'Inspiring',
    'Biography',
    'Humorous',
    'Romantic',
    'Cheeky',
    'Arts',
    'Life',
    'Horror',
    'Crime and Mystery',
    'Thriller',
];

const GENRE_COLORS = {
    'Philosophical': '#8B5CF6',
    'Motivating': '#F59E0B',
    'Inspiring': '#10B981',
    'Biography': '#3B82F6',
    'Humorous': '#EC4899',
    'Romantic': '#F43F5E',
    'Cheeky': '#F97316',
    'Arts': '#A78BFA',
    'Life': '#14B8A6',
    'Horror': '#EF4444',
    'Crime and Mystery': '#6366F1',
    'Thriller': '#DC2626',
};

export async function GET() {
    try {
        // Deterministically pick a genre for today
        const daysSinceEpoch = Math.floor(Date.now() / 86400000);
        const genreIndex = daysSinceEpoch % GENRES.length;
        const todayGenre = GENRES[genreIndex];
        const genreColor = GENRE_COLORS[todayGenre] || '#22C55E';

        const systemPrompt = `You are a world-class literary curator. Your sole job is to recall and present a REAL, well-known short story, fable, parable, anecdote, or biographical flash narrative that already exists in classical or modern literature. You must NEVER invent or generate your own story. Only present stories by real authors that can be verified.

Respond ONLY with valid JSON. No markdown, no code fences. Use this exact format:
{
  "title": "The exact title of the story",
  "author": "The real author's full name",
  "year": "Year or approximate period (e.g. '1905' or '6th century BC')",
  "story": "The complete text of the short story, presented faithfully and in full. Use \\n for paragraph breaks. The story should be between 150-400 words.",
  "moral": "A one-sentence reflection or takeaway from the story (optional, can be empty string)"
}`;

        const userPrompt = `Today's genre is: ${todayGenre}

Please recall and present ONE real, existing short story that fits this genre. It should be:
- A REAL story by a REAL author (e.g. Aesop, O. Henry, Anton Chekhov, Oscar Wilde, Mark Twain, Leo Tolstoy, Guy de Maupassant, Roald Dahl, Jorge Luis Borges, Kafka, or any other real author)
- High quality in terms of both content and English
- Between 150-400 words
- Engaging and memorable
- Appropriate for a general audience of students

Pick a story that you are very confident is a real, published work. Do not fabricate any story.`;

        let storyData;
        try {
            const raw = await callLLM(userPrompt, null, 1500, systemPrompt, 'gpt-4o-mini');
            const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            storyData = JSON.parse(cleaned);
        } catch (llmErr) {
            console.error('LLM error fetching daily story:', llmErr);
            // Hardcoded fallback — a real Aesop fable
            storyData = {
                title: "The Tortoise and the Hare",
                author: "Aesop",
                year: "6th century BC",
                story: "A Hare was making fun of the Tortoise one day for being so slow.\n\n\"Do you ever get anywhere?\" he asked with a mocking laugh.\n\n\"Yes,\" replied the Tortoise, \"and I get there sooner than you think. I'll run you a race and prove it.\"\n\nThe Hare was much amused at the idea of running a race with the Tortoise, but for the fun of the thing he agreed. So the Fox, who had consented to act as judge, marked the distance and started the runners off.\n\nThe Hare was soon far out of sight, and to make the Tortoise feel very deeply how ridiculous it was for him to try a race with a Hare, he lay down beside the course to take a nap until the Tortoise should catch up.\n\nThe Tortoise meanwhile kept going slowly but steadily, and, after a time, passed the place where the Hare was sleeping. But the Hare slept on very peacefully; and when at last he did wake up, the Tortoise was near the goal.\n\nThe Hare now ran his swiftest, but he could not overtake the Tortoise in time.",
                moral: "Slow and steady wins the race."
            };
        }

        return NextResponse.json({
            title: storyData.title,
            author: storyData.author,
            year: storyData.year || '',
            story: storyData.story,
            moral: storyData.moral || '',
            genre: todayGenre,
            genreColor: genreColor,
        });

    } catch (err) {
        console.error('API /daily-story error:', err);
        return NextResponse.json({ error: 'Failed to fetch daily story' }, { status: 500 });
    }
}
