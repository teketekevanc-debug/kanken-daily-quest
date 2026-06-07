// lib/constants.ts
// --- 型定義 ---

export type KanjiWord = {
  id: number;
  kanji: string;
  reading: string;
  okurigana?: string | null;
  emoji: string;
  category: string;
  sentence?: string;
  usage_example?: string;
  origin_logic?: string;
  stroke_count?: number;
  stroke_data_url?: string;
  currentStatus?: string;
};

export type ActivityLog = {
  time: string;
  word: string;
  mode: string;
  result: 'correct' | 'incorrect' | 'done';
};

export type DailyLog = {
  id: number;
  user_id: string;
  date: string;
  count: number;
  is_completed: boolean;
  details: ActivityLog[];
  streak: number;
  study_time_seconds: number;
  collection_views: number;
  parent_reply?: string;
};

export type ChallengeSettings = {
  target_user_id: string;
  mode: 'manual' | 'auto';
  selected_ids: number[];
  auto_count: number;
  quest_count: number;
  special_quest_count: number;
  challenge_quest_count: number;
  reward_goal_days: number;
  reward_text: string;
  owned_rewards: number;
  total_earned_rewards: number;
  unlocked_tips: string[];
};

export type ProgressStats = {
  total: number;
  mastered: number;
  ranks: {
    learning: number;
    bronze: number;
    silver: number;
    gold: number;
  };
  weakWords: {
    word: string;
    meaning: string;
    mistakes: number;
  }[];
  checkWords: any[];
  recentLogs: any[];
  graphData: {
    date: string;
    count: number;
  }[];
  pieData: {
    name: string;
    value: number;
  }[];
};

// --- 定数データ ---

export const USERS = [
  { id: 'brother', db_target: 'brother', name: 'たくま (小6)', color: 'bg-amber-600', light: 'bg-amber-50', border: 'border-amber-600', text: 'text-amber-700', hue: 'from-amber-500 to-orange-600', defaultTipTable: 'minecraft_tips' },
  { id: 'sister', db_target: 'sister', name: 'みのり (小4)', color: 'bg-sky-500', light: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-700', hue: 'from-sky-400 to-indigo-500', defaultTipTable: 'school_tips' },
  { id: 'mami', db_target: 'parent', name: 'まみ', color: 'bg-pink-500', light: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-700', hue: 'from-pink-400 to-rose-500', defaultTipTable: 'school_tips' },
  { id: 'kenta', db_target: 'parent', name: 'けんた', color: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', hue: 'from-emerald-400 to-teal-500', defaultTipTable: 'minecraft_tips' }
];

// ★ 6級・5級を優先するよう並べ替えました
export const CATEGORIES = [
  { id: 'kyu6', name: '6級 (小5)' },
  { id: 'kyu5', name: '5級 (小6)' },
  { id: 'exam_kyu6', name: '🔥漢検6級 過去問対策' },
  { id: 'exam_kyu5', name: '🔥漢検5級 過去問対策' },
  { id: 'kyu10', name: '10級 (小1)' },
  { id: 'kyu9', name: '9級 (小2)' },
  { id: 'kyu8', name: '8級 (小3)' },
  { id: 'kyu7', name: '7級 (小4)' },
  { id: 'general', name: '一般・中学以上' }
];

export const MODE_NAMES: Record<string, string> = {
  daily: '毎日の冒険',
  free: 'フリー練習',
  weekend: '週末ボス',
  parent_challenge: 'パパからの挑戦',
  rick_challenge: 'Rickの特訓',
  revenge: 'リベンジ'
};

// --- ヘルパー関数 ---

export const getUserFirstName = (name: string) => {
  const parts = name.split(' ');
  const [first] = parts; 
  return first || name;
};

const getJSTDate = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

export const getDailyMessage = (userId: string) => {
    if (userId !== 'brother') return "今日も自分のペースで頑張ろう！🚀";
    const day = getJSTDate().getDay();
    
    if (day === 2) return "🔥 火曜日は学習の拠点！ガッツリ進めよう！";
    if (day >= 3 && day <= 5) return "⚡ 塾前1時間の短期集中！ピンポイント特訓だ！";
    if (day === 0 || day === 6) return "⚽ 週末はサッカー全集中！移動時間を活用しよう！";
    return "🚀 今週もコツコツ積み上げよう！";
};