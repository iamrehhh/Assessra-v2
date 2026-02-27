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

    if (allMCQData[params.paperId]) {
        return <MCQView paperId={params.paperId} paperData={allMCQData} onBack={() => router.push('/#pastpapers')} />;
    }

    return <PracticeSplitScreen paperId={params.paperId} />;
}
