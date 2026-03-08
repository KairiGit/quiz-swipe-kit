import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Check, RotateCcw, Trophy, X } from 'lucide-react';
import type {
  LegacyQuizQuestion,
  QuestionProgress,
  QuizQuestion,
  SwipeAnswerEvent,
  SwipeDirection,
  SwipeQuizLabels,
  SwipeQuizProps,
} from './types';

const DEFAULT_LABELS: SwipeQuizLabels = {
  all: 'すべて',
  incorrectOnly: '間違えた問題',
  unansweredOnly: '未回答',
  range: '範囲:',
  shuffle: 'シャッフル',
  statsTitle: '学習統計',
  answered: '回答済み',
  unanswered: '未回答',
  resetProgress: '学習履歴をリセット',
  noQuestionTitle: '問題が見つかりませんでした',
  noQuestionHint: 'フィルタ条件を変更してください',
  touchHint: 'カードに触れている間だけ答えを表示',
  correct: '正解',
  incorrect: '不正解',
  swipeJudgeHint: '← スワイプして判定 →',
  swipeIncorrectHint: '← 不正解にスワイプ',
  swipeCorrectHint: '正解にスワイプ →',
  resetConfirm: '学習履歴をすべてリセットしますか？',
};

const normalizeQuestions = (questions: Array<QuizQuestion | LegacyQuizQuestion>): QuizQuestion[] => {
  return questions.map((item, index) => {
    if ('question' in item && 'answer' in item) {
      return item;
    }

    return {
      id: item.id ?? index + 1,
      category: item.category,
      sub: item.sub,
      question: item.q,
      answer: item.a,
    };
  });
};

const loadProgress = (storageKey: string): Record<string, QuestionProgress> => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveProgress = (storageKey: string, progress: Record<string, QuestionProgress>) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // noop
  }
};

export const SwipeQuiz = ({
  appName,
  questions,
  storageKey = 'swipe-quiz-progress',
  showFooter = true,
  footerText = 'Powered by swipe-quiz-format',
  labels,
  showStatsButton = true,
  enableShuffle = true,
  swipeThreshold = 100,
  autoNextDelayMs = 280,
  onAnswer,
  onProgressReset,
}: SwipeQuizProps) => {
  const text = { ...DEFAULT_LABELS, ...labels };
  const baseQuestions = useMemo(() => normalizeQuestions(questions), [questions]);

  const [questionsList, setQuestionsList] = useState(baseQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [filterType, setFilterType] = useState(text.all);
  const [showStats, setShowStats] = useState(false);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const [progress, setProgress] = useState<Record<string, QuestionProgress>>(() => loadProgress(storageKey));

  useEffect(() => {
    setQuestionsList(baseQuestions);
  }, [baseQuestions]);

  useEffect(() => {
    saveProgress(storageKey, progress);
  }, [progress, storageKey]);

  const categoryOptions = useMemo(() => {
    const categories = baseQuestions.map((q) => q.category);
    return [text.all, ...Array.from(new Set(categories)), text.incorrectOnly, text.unansweredOnly];
  }, [baseQuestions, text.all, text.incorrectOnly, text.unansweredOnly]);

  const displayQuestions = useMemo(() => {
    if (filterType === text.incorrectOnly) {
      return questionsList.filter((q) => progress[String(q.id)]?.lastAnswered === 'incorrect');
    }

    if (filterType === text.unansweredOnly) {
      return questionsList.filter((q) => !progress[String(q.id)]);
    }

    if (filterType !== text.all) {
      return questionsList.filter((q) => q.category === filterType);
    }

    return questionsList;
  }, [filterType, progress, questionsList, text.all, text.incorrectOnly, text.unansweredOnly]);

  const currentQuestion = displayQuestions[currentIndex] ?? null;
  const currentProgress = currentQuestion ? progress[String(currentQuestion.id)] : null;

  const stats = useMemo(() => {
    const total = baseQuestions.length;
    const answered = Object.keys(progress).length;
    const correctCount = Object.values(progress).reduce((sum, p) => sum + p.correct, 0);
    const incorrectCount = Object.values(progress).reduce((sum, p) => sum + p.incorrect, 0);
    const totalAnswers = correctCount + incorrectCount;

    return {
      total,
      answered,
      unanswered: total - answered,
      correctCount,
      incorrectCount,
      accuracy: totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0,
    };
  }, [baseQuestions.length, progress]);

  const progressPercent = displayQuestions.length > 0 ? ((currentIndex + 1) / displayQuestions.length) * 100 : 0;

  const swipeDirection: SwipeDirection =
    swipeOffset > 50 ? 'correct' : swipeOffset < -50 ? 'incorrect' : 'none';

  const rotation = swipeOffset / 20;
  const opacity = 1 - Math.abs(swipeOffset) / 300;

  const resetSwipeState = () => {
    setSwipeOffset(0);
    setTouchStart(null);
    setIsSwiping(false);
  };

  const recordAnswer = (id: string | number, isCorrect: boolean) => {
    const key = String(id);
    const answeredQuestion = displayQuestions[currentIndex] ?? null;

    setProgress((prev) => {
      const current = prev[key] || { correct: 0, incorrect: 0 };
      return {
        ...prev,
        [key]: {
          correct: isCorrect ? current.correct + 1 : current.correct,
          incorrect: isCorrect ? current.incorrect : current.incorrect + 1,
          lastAnswered: isCorrect ? 'correct' : 'incorrect',
        },
      };
    });

    if (answeredQuestion && onAnswer) {
      const payload: SwipeAnswerEvent = {
        question: answeredQuestion,
        isCorrect,
        index: currentIndex,
      };
      onAnswer(payload);
    }
  };

  const goNext = () => {
    if (currentIndex < displayQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!currentQuestion) return;
    setShowAnswer(true);
    setTouchStart(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !currentQuestion) return;
    setSwipeOffset(e.touches[0].clientX - touchStart);
  };

  const onTouchEnd = () => {
    if (!showAnswer || !currentQuestion) {
      resetSwipeState();
      setShowAnswer(false);
      return;
    }

    if (Math.abs(swipeOffset) > swipeThreshold) {
      recordAnswer(currentQuestion.id, swipeOffset > 0);
      setTimeout(() => {
        goNext();
        resetSwipeState();
      }, autoNextDelayMs);
      return;
    }

    resetSwipeState();
    setShowAnswer(false);
  };

  const onMouseDown = () => {
    if (!currentQuestion) return;
    setShowAnswer(true);
  };

  const onMouseUpOrLeave = () => {
    setShowAnswer(false);
  };

  const onShuffle = () => {
    setQuestionsList([...baseQuestions].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const onResetProgress = () => {
    if (confirm(text.resetConfirm)) {
      setProgress({});
      localStorage.removeItem(storageKey);
      onProgressReset?.();
    }
  };

  return (
    <div className="h-dvh overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-2 md:p-4 font-sans text-slate-800">
      <div className="max-w-md mx-auto h-full flex flex-col gap-2 md:gap-3">
        <header className="text-center">
          <h1 className="text-lg md:text-2xl font-black text-indigo-700 flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            {appName}
          </h1>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-bold">
            <div className="bg-white/80 backdrop-blur px-2.5 py-1 rounded-lg shadow-sm">
              <span className="text-indigo-600">{stats.accuracy}%</span>
            </div>
            <div className="bg-white/80 backdrop-blur px-2.5 py-1 rounded-lg shadow-sm">
              <span className="text-green-600">✓{stats.correctCount}</span>
            </div>
            <div className="bg-white/80 backdrop-blur px-2.5 py-1 rounded-lg shadow-sm">
              <span className="text-rose-600">✗{stats.incorrectCount}</span>
            </div>
            {showStatsButton && (
              <button
                onClick={() => setShowStats((prev) => !prev)}
                className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg active:scale-95 transition-transform flex items-center gap-1"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {showStatsButton && showStats && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 p-4 flex items-center justify-center">
            <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl border border-indigo-200 max-h-[85dvh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-indigo-700">{text.statsTitle}</h3>
                <button onClick={() => setShowStats(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1">{text.answered}</div>
                  <div className="text-2xl font-black text-indigo-600">{stats.answered}/{stats.total}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1">{text.unanswered}</div>
                  <div className="text-2xl font-black text-slate-600">{stats.unanswered}</div>
                </div>
              </div>
              <button
                onClick={onResetProgress}
                className="w-full bg-rose-50 text-rose-600 py-3 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {text.resetProgress}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur p-2.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-500">{text.range}</span>
            {enableShuffle && (
              <button
                onClick={onShuffle}
                className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full text-xs font-black active:scale-95 transition-transform"
              >
                {text.shuffle}
              </button>
            )}
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="inline-flex gap-1.5 pr-2 min-w-full">
              {categoryOptions.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setFilterType(cat);
                    setCurrentIndex(0);
                    setShowAnswer(false);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95 ${
                    filterType === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-1">
          <div className="flex justify-between items-end mb-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-indigo-600">{displayQuestions.length > 0 ? currentIndex + 1 : 0}</span>
              <span className="text-xs font-bold text-slate-400">/ {displayQuestions.length}</span>
            </div>
            <span className="text-xs font-black text-indigo-400">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {showAnswer && (
          <div className="flex justify-between items-center px-2 short-screen:hidden">
            <div
              className={`flex items-center gap-2 text-sm font-bold transition-all ${
                swipeDirection === 'incorrect' ? 'text-rose-600 scale-110' : 'text-slate-300'
              }`}
            >
              <X className="w-5 h-5" />
              <span>{text.incorrect}</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">{text.swipeJudgeHint}</div>
            <div
              className={`flex items-center gap-2 text-sm font-bold transition-all ${
                swipeDirection === 'correct' ? 'text-green-600 scale-110' : 'text-slate-300'
              }`}
            >
              <span>{text.correct}</span>
              <Check className="w-5 h-5" />
            </div>
          </div>
        )}

        <div className="relative h-full min-h-0">
          {currentQuestion ? (
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUpOrLeave}
              onMouseLeave={onMouseUpOrLeave}
              className="bg-white w-full h-full rounded-3xl shadow-2xl p-4 md:p-5 flex flex-col justify-between transition-all touch-none select-none"
              style={{
                transform: `translateX(${swipeOffset}px) rotate(${rotation}deg)`,
                opacity: isSwiping ? opacity : 1,
                transition: isSwiping ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
                border:
                  swipeDirection === 'correct'
                    ? '4px solid rgb(34, 197, 94)'
                    : swipeDirection === 'incorrect'
                      ? '4px solid rgb(244, 63, 94)'
                      : '4px solid rgb(199, 210, 254)',
                backgroundColor:
                  swipeDirection === 'correct'
                    ? 'rgba(34, 197, 94, 0.05)'
                    : swipeDirection === 'incorrect'
                      ? 'rgba(244, 63, 94, 0.05)'
                      : 'white',
              }}
            >
              <div className="w-full flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">
                    {currentQuestion.category}
                  </span>
                  {currentProgress && (
                    <div className="flex items-center gap-1 text-xs font-bold">
                      {currentProgress.correct > 0 && <span className="text-green-600 font-bold">✓{currentProgress.correct}</span>}
                      {currentProgress.incorrect > 0 && <span className="text-rose-600 font-bold">✗{currentProgress.incorrect}</span>}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-400 italic">#{currentQuestion.sub ?? '-'}</span>
              </div>

              <div className="flex-1 min-h-0 flex items-center justify-center w-full py-2">
                <p className="text-base md:text-lg font-bold leading-snug text-slate-800 text-center px-1">{currentQuestion.question}</p>
              </div>

              <div className="w-full flex flex-col items-center justify-center gap-3">
                {showAnswer ? (
                  <div className="w-full text-center">
                    <div className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">{text.correct}</div>
                    <div className="text-2xl font-black text-white bg-gradient-to-r from-green-500 to-emerald-500 py-5 px-6 rounded-2xl shadow-xl">
                      {currentQuestion.answer}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">TOUCH</div>
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-2xl font-black text-sm md:text-base shadow-2xl">
                      {text.touchHint}
                    </div>
                  </div>
                )}

                <div className="mt-1 w-full grid grid-cols-2 gap-2 text-xs font-black">
                  <div className="text-rose-500 bg-rose-50 rounded-xl py-2 text-center">{text.swipeIncorrectHint}</div>
                  <div className="text-green-600 bg-green-50 rounded-xl py-2 text-center">{text.swipeCorrectHint}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white h-full rounded-3xl p-8 text-center shadow-xl border-4 border-indigo-100">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-bold text-slate-400 text-sm">{text.noQuestionTitle}</p>
              <p className="text-xs text-slate-300 mt-2">{text.noQuestionHint}</p>
            </div>
          )}
        </div>

        {showFooter && (
          <footer className="mt-2 text-center text-slate-400 text-[10px] font-bold tracking-widest uppercase short-screen:hidden">
            {footerText}
          </footer>
        )}
      </div>
    </div>
  );
};
