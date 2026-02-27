import PracticeSplitScreen from '@/components/past-papers/PracticeSplitScreen';

export default function PastPaperPracticePage({ params }) {
    return <PracticeSplitScreen paperId={params.paperId} />;
}
