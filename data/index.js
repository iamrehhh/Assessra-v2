// Central data index — import all paper data from here
import { businessP3Data, businessP3Papers } from './papers/businessP3';
import { businessP4Data, businessP4Papers } from './papers/businessP4';
import { economicsP4Data, economicsP4Papers } from './papers/economicsP4';

// Combined lookup map: paperID → paper data (questions + pdf)
export const allPaperData = {
    ...businessP3Data,
    ...businessP4Data,
    ...economicsP4Data,
};

// Paper listing metadata grouped by subject-paper key
export const paperListings = {
    'business-p3': businessP3Papers,
    'business-p4': businessP4Papers,
    'economics-p4': economicsP4Papers,
    'economics-p3': [], // MCQ — handled separately
    'general-p1': [], // General Paper — handled separately
    'general-p2': [], // General Paper 2 — handled separately
};
