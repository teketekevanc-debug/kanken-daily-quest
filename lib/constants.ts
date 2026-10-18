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
  { id: 'brother', db_target: 'brother', name: 'たくま (小6)', color: 'bg-amber-600', light: 'bg-amber-50', border: 'border-amber-600', text: 'text-amber-700', hue: 'from-amber-500 to-orange-600', defaultTipTable: 'splatoon_tips' },
  { id: 'sister', db_target: 'sister', name: 'みのり (小4)', color: 'bg-sky-500', light: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-700', hue: 'from-sky-400 to-indigo-500', defaultTipTable: 'school_tips' },
  { id: 'mami', db_target: 'parent', name: 'まみ', color: 'bg-pink-500', light: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-700', hue: 'from-pink-400 to-rose-500', defaultTipTable: 'school_tips' },
  { id: 'kenta', db_target: 'parent', name: 'けんた', color: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', hue: 'from-emerald-400 to-teal-500', defaultTipTable: 'minecraft_tips' }
];

// 受験対策・分野別の教材カテゴリ
export const CATEGORIES = [
  { id: 'exam_frequent', name: '中学受験 頻出漢字' }, // ★メインを一番上に配置
  { id: 'idiom', name: '四字熟語・慣用句' },
  { id: 'synonym_antonym', name: '対義語・類義語' },
  { id: 'grammar', name: '言葉の知識・文法' },
  { id: 'loanword_emotion', name: '外来語・心情語' },
  { id: 'exam_kyu6', name: '6級(中学受験・頻出)' },
  { id: 'exam_kyu5', name: '5級(中学受験・頻出)' },
  { id: 'kyu4', name: '4級(中学受験・頻出)' },
  { id: 'mission_100', name: '合格への100日特訓' },
  { id: 'kyu6', name: '小学5年相当' },
  { id: 'kyu5', name: '小学6年相当' },
  { id: 'kyu10', name: '10級 (小1)' },
  { id: 'kyu9', name: '9級 (小2)' },
  { id: 'kyu8', name: '8級 (小3)' },
  { id: 'kyu7', name: '7級 (小4)' },
  { id: 'general', name: '一般・中学以上' },
];

export type ExamMissionPhase = {
  phase: 0 | 1 | 2 | 3 | 4;
  dayNumber: number;
  daysUntilStart: number;
  daysUntilExam: number;
  title: string;
  focus: string;
  period: string;
  categoryIds: string[];
  isActive: boolean;
};

// ★特訓計画: 頻出漢字30日、語彙強化30日、本番まで仕上げる。試験日は2027-02-01。
export const getExamMissionPhase = (date = new Date()): ExamMissionPhase => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const getPart = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const todayUtc = Date.UTC(getPart('year'), getPart('month') - 1, getPart('day'));
  const startUtc = Date.UTC(2026, 9, 1); // 10月1日スタート
  const examUtc = Date.UTC(2027, 1, 1);
  const dayMs = 24 * 60 * 60 * 1000;
  const daysUntilExam = Math.max(0, Math.ceil((examUtc - todayUtc) / dayMs));
  const daysUntilStart = Math.max(0, Math.ceil((startUtc - todayUtc) / dayMs));
  const dayNumber = Math.floor((todayUtc - startUtc) / dayMs) + 1;

  if (todayUtc < startUtc) {
    return {
      phase: 0, dayNumber: 0, daysUntilStart, daysUntilExam,
      title: '準備期間', focus: '教材をそろえ、1日10分カードを習慣にする',
      period: '10月1日スタート', categoryIds: ['exam_frequent'], isActive: false
    };
  }
  if (todayUtc >= examUtc) {
    return {
      phase: 4, dayNumber: 100, daysUntilStart: 0, daysUntilExam,
      title: '本番日', focus: '多摩大目黒（特待）・桐光学園 入試本番',
      period: '2月1日', categoryIds: ['exam_frequent', 'idiom', 'synonym_antonym'], isActive: false
    };
  }
  if (dayNumber <= 30) {
    return {
      phase: 1, dayNumber, daysUntilStart: 0, daysUntilExam,
      title: '頻出漢字マスター期', focus: '「中学受験 頻出漢字」を徹底的にインプット！正確に書けるようにしよう。',
      period: '10月1日〜10月30日',
      categoryIds: ['exam_frequent'], // ★ 頻出漢字のみを集中特訓
      isActive: true
    };
  }
  if (dayNumber <= 60) {
    return {
      phase: 2, dayNumber, daysUntilStart: 0, daysUntilExam,
      title: '語彙力強化期', focus: '頻出漢字に加えて、四字熟語や慣用句・類義語など入試で差がつく語彙を練習する',
      period: '10月31日〜11月29日',
      categoryIds: ['exam_frequent', 'idiom', 'synonym_antonym'], // ★ 頻出漢字 ＋ 語彙（四字熟語・類義語など）
      isActive: true
    };
  }
  return {
    phase: 3, dayNumber: Math.min(dayNumber, 100), daysUntilStart: 0, daysUntilExam,
    title: '入試本番仕上げ期', focus: '本番形式のミックス出題！頻出問題・苦手分野を時間内に解き、正答を安定させる',
    period: '11月30日〜1月31日',
    // ★ 語彙全般のミックス。古い学年別（kyu6など）は外しています。
    categoryIds: ['exam_frequent', 'idiom', 'synonym_antonym', 'grammar', 'loanword_emotion'], 
    isActive: true
  };
};

export const MODE_NAMES: Record<string, string> = {
  daily: '毎日の冒険',
  free: 'フリー練習',
  weekend: '週末ボス',
  parent_challenge: 'パパからの挑戦',
  rick_challenge: 'Rickの特訓',
  revenge: 'リベンジ',
  mission_100: '合格への100日特訓',
  exam: '受験モード (弱点特訓)' // ★ 追加
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