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
  mistakeCount?: number;
};

export type ActivityLog = {
  time: string;
  word: string;
  mode: string;
  result: 'correct' | 'incorrect' | 'done';
  timeSpent?: number; // ★追加：解答にかかった秒数
  taskType?: 'new' | 'review'; // ★追加：新規か復習か
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
};

// --- 定数データ ---

export const USERS = [
  { id: 'brother', db_target: 'brother', name: 'たくま (小6)', color: 'bg-stone-800', light: 'bg-stone-50', text: 'text-stone-800' },
  { id: 'sister', db_target: 'sister', name: 'みのり (小4)', color: 'bg-stone-800', light: 'bg-stone-50', text: 'text-stone-800' },
  { id: 'mami', db_target: 'parent', name: 'まみ', color: 'bg-rose-800', light: 'bg-rose-50', text: 'text-rose-800' },
  { id: 'kenta', db_target: 'parent', name: 'けんた', color: 'bg-sky-800', light: 'bg-sky-50', text: 'text-sky-800' }
];

// 受験対策・分野別の教材カテゴリ
export const CATEGORIES = [
  // --- 新カテゴリ（これからの登録用：ランク分類を採用） ---
  { id: 'v2_rank_a', name: '【新】ランクA（最頻出）' },
  { id: 'v2_rank_b', name: '【新】ランクB（頻出）' },
  { id: 'v2_rank_c', name: '【新】ランクC（差がつく）' },
  
  // (必要に応じてその他の新カテゴリ)
  { id: 'v2_idiom_read', name: '【新】難読・特殊な読み' },
  { id: 'v2_vocab_relation', name: '【新】対義語・類義語・四字熟語' },
  
  // --- 旧カテゴリ（書庫行き） ---
  { id: 'exam_frequent', name: '【旧】中学受験 頻出漢字' },
  { id: 'idiom', name: '【旧】四字熟語・慣用句' },
  { id: 'synonym_antonym', name: '【旧】対義語・類義語' },
  { id: 'exam_kyu6', name: '【旧】6級(頻出)' },
  { id: 'exam_kyu5', name: '【旧】5級(頻出)' },
  { id: 'kyu6', name: '【旧】小学5年相当' },
  { id: 'kyu5', name: '【旧】小学6年相当' },
  { id: 'general', name: '一般・その他' },
];

// モード定義もシンプルに
export const MODE_NAMES: Record<string, string> = {
  daily_drill: '今日のドリル',
  notebook: '取り組みノート',
  archive: '書庫（過去のデータ）'
};

// --- ヘルパー関数 ---
export const getUserFirstName = (name: string) => name.split(' ')[0] || name;
export const getJSTDate = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));