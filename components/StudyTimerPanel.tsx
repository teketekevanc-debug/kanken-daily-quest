'use client'

type StudyTimerPanelProps = {
  elapsedSeconds: number;
  isRunning: boolean;
  isStudyAreaActive: boolean;
  onStart: () => void;
  onPause: () => void;
};

export default function StudyTimerPanel({
  elapsedSeconds,
  isRunning,
  isStudyAreaActive,
  onStart,
  onPause,
}: StudyTimerPanelProps) {
  const isComplete = elapsedSeconds >= 600;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <div className="fixed right-3 top-3 z-60 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 py-1.5 pl-2.5 pr-1.5 shadow-md backdrop-blur-sm" title="1日10分学習タイマー">
      <span className={`h-2 w-2 rounded-full ${isComplete ? 'bg-amber-400' : isRunning && isStudyAreaActive ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
      <span className="min-w-14 text-center font-mono text-sm font-black tabular-nums text-stone-700" aria-live="polite">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
        <button
          onClick={isRunning ? onPause : onStart}
          aria-label={isRunning ? '10分タイマーを一時停止' : isComplete ? '10分タイマーをリセットして開始' : '10分タイマーを開始'}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white transition active:scale-90"
        >
          {isRunning ? 'Ⅱ' : isComplete ? '↻' : '▶'}
        </button>
    </div>
  );
}
