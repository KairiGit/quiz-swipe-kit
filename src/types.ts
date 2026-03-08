export type SwipeDirection = 'correct' | 'incorrect' | 'none';

export interface QuizQuestion {
  id: string | number;
  category: string;
  sub?: string;
  question: string;
  answer: string;
}

export interface LegacyQuizQuestion {
  id: string | number;
  category: string;
  sub?: string;
  q: string;
  a: string;
}

export interface QuestionProgress {
  correct: number;
  incorrect: number;
  lastAnswered?: 'correct' | 'incorrect';
}

export interface SwipeQuizLabels {
  all: string;
  incorrectOnly: string;
  unansweredOnly: string;
  range: string;
  shuffle: string;
  statsTitle: string;
  answered: string;
  unanswered: string;
  resetProgress: string;
  noQuestionTitle: string;
  noQuestionHint: string;
  touchHint: string;
  correct: string;
  incorrect: string;
  swipeJudgeHint: string;
  swipeIncorrectHint: string;
  swipeCorrectHint: string;
  resetConfirm: string;
}

export interface SwipeAnswerEvent {
  question: QuizQuestion;
  isCorrect: boolean;
  index: number;
}

export interface SwipeQuizProps {
  appName: string;
  questions: Array<QuizQuestion | LegacyQuizQuestion>;
  storageKey?: string;
  showFooter?: boolean;
  footerText?: string;
  labels?: Partial<SwipeQuizLabels>;
  showStatsButton?: boolean;
  enableShuffle?: boolean;
  swipeThreshold?: number;
  autoNextDelayMs?: number;
  onAnswer?: (event: SwipeAnswerEvent) => void;
  onProgressReset?: () => void;
}
