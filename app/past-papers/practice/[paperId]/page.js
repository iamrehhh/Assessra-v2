'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { allMCQData } from '@/data/index';

const PracticeSplitScreen = dynamic(
    () => import('@/components/past-papers/PracticeSplitScreen'),
    { ssr: false }
);

const MCQView = dynamic(
    () => import('@/components/MCQView'),
    { ssr: false }
);

export default function PastPaperPracticePage() {
    const params = useParams();
    const router = useRouter();

    if (!params.paperId) return null;

    const paperId = decodeURIComponent(params.paperId);

    console.log('--- DEBUG PastPaperPracticePage ---');
    console.log('params.paperId:', params.paperId);
    console.log('decoded paperId:', paperId);
    console.log('allMCQData keys:', Object.keys(allMCQData));
    console.log('is MCQ?', !!allMCQData[paperId]);

    if (allMCQData[paperId]) {
        return <MCQView paperId={paperId} paperData={allMCQData} onBack={() => router.push('/#pastpapers')} />;
    }

    return <PracticeSplitScreen paperId={params.paperId} />;
}
