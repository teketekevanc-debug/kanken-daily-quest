// src/lib/constants.ts (新規作成)

export type KanjiWord = { id: number; kanji: string; /* 中略 */ }
export type ActivityLog = { time: string, word: string, mode: string, result: 'correct' | 'incorrect' | 'done' }
export type DailyLog = { id: number; date: string; /* 中略 */ }
export type ChallengeSettings = { mode: 'manual' | 'auto'; /* 中略 */ }

// 学年が上がったタイミングに合わせて、学年表記も更新しておきます
export const USERS = [
  { id: 'brother', db_target: 'brother', name: 'たくま (小6)', color: 'bg-amber-600', light: 'bg-amber-50', border: 'border-amber-600', text: 'text-amber-700', hue: 'from-amber-500 to-orange-600', defaultTipTable: 'minecraft_tips' },
  { id: 'sister', db_target: 'sister', name: 'みのり (小4)', color: 'bg-sky-500', light: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-700', hue: 'from-sky-400 to-indigo-500', defaultTipTable: 'school_tips' },
  { id: 'mami', db_target: 'parent', name: 'まみ', color: 'bg-pink-500', light: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-700', hue: 'from-pink-400 to-rose-500', defaultTipTable: 'school_tips' },
  { id: 'kenta', db_target: 'parent', name: 'けんた', color: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', hue: 'from-emerald-400 to-teal-500', defaultTipTable: 'minecraft_tips' }
]

export const CATEGORIES = [ /* 中略 */ ]
export const MODE_NAMES: Record<string, string> = { /* 中略 */ }

// 安全にユーザー名を取得する関数もこちらへ移動
export const getUserFirstName = (name: string) => {
  const parts = name.split(' ');
  const [first] = parts; // ★ 分割代入ルールを適用
  return first || name;
};

// --- ここから追記 ---

// 日付取得用関数
const getJSTDate = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

// たくま君のスケジュールに合わせた応援メッセージ
export const getDailyMessage = (userId: string) => {
    if (userId !== 'brother') return "今日も自分のペースで頑張ろう！🚀";
    const day = getJSTDate().getDay();
    
    if (day === 2) return "🔥 火曜日は学習の拠点！ガッツリ進めよう！";
    if (day >= 3 && day <= 5) return "⚡ 塾前1時間の短期集中！ピンポイント特訓だ！";
    if (day === 0 || day === 6) return "⚽ 週末はサッカー全集中！移動時間を活用しよう！";
    return "🚀 今週もコツコツ積み上げよう！";
}