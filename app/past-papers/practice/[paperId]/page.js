import dynamic from 'next/dynamic';

const PracticeSplitScreen = dynamic(
    () => import('@/components/past-papers/PracticeSplitScreen'),
    { ssr: false }
);

export default function PastPaperPracticePage({ params }) {
    return <PracticeSplitScreen paperId={params.paperId} />;
}
