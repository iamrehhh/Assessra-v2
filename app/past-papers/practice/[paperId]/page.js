'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const PracticeSplitScreen = dynamic(
    () => import('@/components/past-papers/PracticeSplitScreen'),
    { ssr: false }
);

export default function PastPaperPracticePage() {
    const params = useParams();

    if (!params.paperId) return null;

    return <PracticeSplitScreen paperId={params.paperId} />;
}
