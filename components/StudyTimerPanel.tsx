'use client'

type StudyTimerPanelProps = {
  elapsedSeconds: number;
  isRunning: boolean;
  isKanjiVisible: boolean;
  onStart: () => void;
  onPause: () => void;
};

export default function StudyTimerPanel({
  elapsedSeconds,
  isRunning,
  isKanjiVisible,
  onStart,
  onPause,
}: StudyTimerPanelProps) {
  const remainingSeconds = Math.max(0, 600 - elapsedSeconds);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isComplete = elapsedSeconds >= 600;

  return (
    <section className="w-full rounded-3xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-widest text-emerald-700">☀️ 朝の10分カード</p>
          <p className="mt-1 text-sm font-bold text-stone-600">
            {isComplete
              ? '今日の10分完了！よく頑張りました。'
              : isRunning && isKanjiVisible
                ? `漢字を見ながら学習中 · あと ${minutes}分 ${String(seconds).padStart(2, '0')}秒`
                : isRunning
                  ? `カードを開くと計測 · あと ${minutes}分 ${String(seconds).padStart(2, '0')}秒`
                  : `目標まで ${minutes}分 ${String(seconds).padStart(2, '0')}秒`}
          </p>
        </div>
        <button
          onClick={isRunning ? onPause : onStart}
          className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md transition active:scale-95"
        >
          {isRunning ? '一時停止' : isComplete ? 'もう一度' : elapsedSeconds > 0 ? '再開する' : '10分スタート'}
        </button>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 transition-all"
          style={{ width: `${Math.min((elapsedSeconds / 600) * 100, 100)}%` }}
        />
      </div>
    </section>
  );
}
