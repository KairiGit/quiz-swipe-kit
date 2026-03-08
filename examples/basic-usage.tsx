import { SwipeQuiz } from 'swipe-quiz-format';

const sampleQuestions = [
  {
    id: 1,
    category: '基礎',
    sub: '用語',
    question: '品質とは何か？',
    answer: '顧客要求を満たす度合い',
  },
  {
    id: 2,
    category: '基礎',
    sub: 'QC7',
    q: '重要な少数を見つける図は？',
    a: 'パレート図',
  },
];

export const Demo = () => {
  return <SwipeQuiz appName="Demo Quiz" questions={sampleQuestions} storageKey="demo-quiz-progress" />;
};
