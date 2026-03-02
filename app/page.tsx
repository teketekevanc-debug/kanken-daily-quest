'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import confetti from 'canvas-confetti'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Label } from 'recharts'

const USERS = [
  { id: 'brother', name: 'たくま (小5)', color: 'bg-amber-600', light: 'bg-amber-50', border: 'border-amber-600', text: 'text-amber-700', hue: 'from-amber-500 to-orange-600', defaultTipTable: 'minecraft_tips' },
  { id: 'sister', name: 'みのり (小3)', color: 'bg-sky-500', light: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-700', hue: 'from-sky-400 to-indigo-500', defaultTipTable: 'school_tips' }
]

const CATEGORIES = [{ id: 'general', name: 'その他' }, { id: 'grade1', name: '小1レベル (10級)' }, { id: 'grade2', name: '小2レベル (9級)' }, { id: 'grade3', name: '小3レベル (8級)' }, { id: 'grade4', name: '小4レベル (7級)' }, { id: 'grade5', name: '小5レベル (6級)' }, { id: 'grade6', name: '小6レベル (5級)' }, { id: 'middle', name: '中学レベル (4級~)' }]
const MODE_NAMES: Record<string, string> = { daily: '🚀 今日の冒険', free: '⚔️ フリー', weekend: '🏰 週末ボス', parent_challenge: '🔥 パパ挑戦状', rick_challenge: '⚡ Rick挑戦', revenge: '💀 リベンジ' }

type KanjiWord = { id: number; kanji: string; reading: string; okurigana: string | null; sentence: string; emoji: string; category: string; stroke_count: number | null; stroke_data_url: string | null; usage_example?: string | null; origin_logic?: string | null; riskScore?: number; target_user?: string }
type ActivityLog = { time: string, word: string, mode: string, result: 'correct' | 'incorrect' | 'done' }
type DailyLog = { id: number; date: string; is_completed: boolean; count: number; child_comment?: string; parent_reply?: string; streak?: number; details?: ActivityLog[] }
type ProgressStats = { total: number; mastered: number; ranks: {learning:number, bronze:number, silver:number, gold:number}; weakWords: { word: string; meaning: string; mistakes: number }[]; checkWords: { id: number, word: string; meaning: string; }[]; recentLogs: DailyLog[]; graphData: any[]; pieData: any[] }
type ChallengeSettings = { mode: 'manual' | 'auto'; selected_ids: number[]; auto_count: number; quest_count: number; special_quest_count: number; challenge_quest_count: number; reward_goal_days: number; reward_text: string; }

// ★誤って消してしまっていた設定データを復活させました！
const RICK_MESSAGES = ["あそぼ！...じゃなくて勉強だワン！", "くんくん...正解の匂いがするワン！", "かっこいい字だワン！🦴", "その調子だワン！散歩はその後だワン！", "Rickも応援してるワン！"]
const DEFAULT_TIPS_BROTHER = ["ダイヤモンドはY座標-58付近で一番見つかるよ！", "エンダーマンは水が苦手だよ！", "松明は湧き潰しに重要だよ！"]
const DEFAULT_TIPS_SISTER = ["リボンは手首のスナップをきかせると綺麗に回るよ！", "柔軟体操は毎日お風呂上がりにやると効果的！", "つま先までピンと伸ばすと姿勢が美しく見えるよ！"]

const PIE_COLORS = ['#E5E7EB', '#CD7F32', '#C0C0C0', '#FFD700']
const getJSTDateString = (dateObj: Date) => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dateObj).replace(/\//g, '-')
const getTodayJST = () => getJSTDateString(new Date())

export default function Home() {
  const renderReading = (reading: string, okurigana?: string | null) => {
      if (!okurigana) return <span>{reading}</span>;
      return (
        <span className="inline-flex items-baseline">
          <span>{reading}</span>
          <span className="text-[0.75em] font-bold ml-[1px] opacity-60">{okurigana}</span>
        </span>
      );
  };
  const getFullReading = (reading: string, okurigana?: string | null) => okurigana ? `${reading}${okurigana}` : reading;
  const formatReading = (reading: string, okurigana?: string | null) => okurigana ? `${reading}・${okurigana}` : reading;

  const stopSpeaking = () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); };

  const [currentUser, setCurrentUser] = useState(USERS[0])
  const [view, setView] = useState<'menu'|'game'|'rick_challenge'|'result'|'admin'|'collection'>('menu')
  const [mode, setMode] = useState<'daily'|'free'|'weekend'|'parent_challenge'|'rick_challenge'|'revenge'>('daily')
  const [loading, setLoading] = useState(false); const [comparison, setComparison] = useState({ thisWeek: 0, lastWeek: 0 })
  const [selectedInputMode, setSelectedInputMode] = useState<'quiz_kanji'|'typing_read'>('quiz_kanji')
  const [collectionTab, setCollectionTab] = useState('general'); const [flashcardMode, setFlashcardMode] = useState<'normal'|'hide_kanji'|'hide_reading'>('normal')
  const [revealedCards, setRevealedCards] = useState<number[]>([]); const [reviewRevealed, setReviewRevealed] = useState<number[]>([])
  
  const [adminTab, setAdminTab] = useState<'stats'|'challenge'|'add_word'|'add_tip'|'manage'>('stats'); const [adminTargetUser, setAdminTargetUser] = useState(USERS[0])
  const [newWord, setNewWord] = useState({ kanji: '', reading: '', okurigana: '', sentence: '', emoji: '📝', category: 'general', stroke_count: '', stroke_data_url: '', usage_example: '', origin_logic: '' })
  const [newTip, setNewTip] = useState(''); const [tipType, setTipType] = useState<'brother'|'sister'>('brother')
  const [allWordsList, setAllWordsList] = useState<any[]>([]); const [showAllWeakWords, setShowAllWeakWords] = useState(false)
  const [selectedLogDate, setSelectedLogDate] = useState<string|null>(null); const [editStreak, setEditStreak] = useState(0)
  const [challengeSettings, setChallengeSettings] = useState<ChallengeSettings>({ mode: 'auto', selected_ids: [], auto_count: 5, quest_count: 5, special_quest_count: 10, challenge_quest_count: 8, reward_goal_days: 14, reward_text: '好きなおやつ' })
  const [hasParentChallenge, setHasParentChallenge] = useState(false); const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  
  const [currentGameGoal, setCurrentGameGoal] = useState(5); const [questQueue, setQuestQueue] = useState<KanjiWord[]>([]); const [currentIndex, setCurrentIndex] = useState(0)
  const [dailyProgress, setDailyProgress] = useState<DailyLog>({ id: 0, date: getTodayJST(), count: 0, is_completed: false })
  const [monthlyLogs, setMonthlyLogs] = useState<DailyLog[]>([]); const [stats, setStats] = useState<ProgressStats>({ total: 0, mastered: 0, ranks: {learning:0, bronze:0, silver:0, gold:0}, weakWords: [], checkWords: [], recentLogs: [], graphData: [], pieData: [] })
  const [collectionData, setCollectionData] = useState<any>({ gold: [], silver: [], bronze: [], learning: [] }); const [reviewCandidates, setReviewCandidates] = useState<KanjiWord[]>([])
  const [rickStep, setRickStep] = useState<0|1|2>(0); const [weekendPhase, setWeekendPhase] = useState<1|2|3>(1); const [weekendTips, setWeekendTips] = useState<string[]>([])
  
  const [bossHp, setBossHp] = useState(10); const [isBossAttacked, setIsBossAttacked] = useState(false); const [userAnswer, setUserAnswer] = useState('')
  const [message, setMessage] = useState(''); const [showRick, setShowRick] = useState(false); const [rickComment, setRickComment] = useState("頑張るワン！")
  const [mistakeCount, setMistakeCount] = useState(0); const [rewardTip, setRewardTip] = useState<string|null>(null); const [completeBonusTip, setCompleteBonusTip] = useState<string|null>(null)
  
  const [feedbackMsg, setFeedbackMsg] = useState<React.ReactNode | null>(null)
  
  const [showHint, setShowHint] = useState(false); const [showFlashAnswer, setShowFlashAnswer] = useState(false); const [isTransitioning, setIsTransitioning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false); const [childCommentInput, setChildCommentInput] = useState(''); const [parentReplyInput, setParentReplyInput] = useState('')
  const [editingLogId, setEditingLogId] = useState<number|null>(null); const [langMode, setLangMode] = useState<'kanji_to_read'|'read_to_kanji'>('read_to_kanji')
  const [inputMode, setInputMode] = useState<'quiz'|'typing'>('quiz'); const [options, setOptions] = useState<KanjiWord[]>([])

  const playSound = (type: 'correct'|'wrong'|'clear') => { const audio = new Audio(`/sounds/${type}.mp3`); audio.volume = 0.5; audio.play().catch(e=>console.log(e)); }
  const speakWord = (text: string) => { stopSpeaking(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP'; speechSynthesis.speak(u); }

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') { checkDailyProgress(); checkChallengeStatus(); fetchMonthlyLogs(calendarDate); } };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    checkDailyProgress(); fetchMonthlyLogs(calendarDate); fetchReviewCandidates(); checkChallengeStatus(); setAdminTargetUser(currentUser);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, view, calendarDate])

  const checkDailyProgress = async () => {
    const today = getTodayJST();
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).single()
    if (data) {
        if (!data.is_completed) {
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); 
            const { data: yLog } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', getJSTDateString(yesterday)).single();
            setDailyProgress({ ...data, streak: (yLog?.is_completed) ? (yLog.streak || 0) : 0 });
        } else setDailyProgress(data);
    } else {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); 
        const { data: yLog } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', getJSTDateString(yesterday)).single();
        setDailyProgress({ id: 0, date: today, count: 0, is_completed: false, details: [], streak: (yLog?.is_completed) ? (yLog.streak || 0) : 0 })
    }
  }
  
  const checkChallengeStatus = async () => {
    const { data } = await supabase.from('challenge_settings').select('*').eq('target_user_id', currentUser.id).single()
    if (data) {
        setHasParentChallenge((data.mode === 'manual' ? (data.selected_ids?.length > 0) : (data.auto_count > 0)))
        setChallengeSettings(prev => ({ ...prev, quest_count: data.quest_count || 5, special_quest_count: data.special_quest_count || 10, challenge_quest_count: data.challenge_quest_count || 8, reward_goal_days: data.reward_goal_days || 14, reward_text: data.reward_text || '好きなおやつ' }));
    } else setHasParentChallenge(false)
  }

  const fetchMonthlyLogs = async (targetDate: Date = calendarDate) => {
    const year = targetDate.getFullYear(); const month = targetDate.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).gte('date', firstDay).lte('date', lastDay)
    if (data) setMonthlyLogs(data)
  }

  const fetchComparison = async () => {}

  const fetchCollection = async () => {
    setLoading(true); setRevealedCards([])
    const { data: allWords } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.id)
    const { data: progress } = await supabase.from('user_progress').select('*').eq('user_id', currentUser.id)
    const groups = { gold: [] as any[], silver: [] as any[], bronze: [] as any[], learning: [] as any[] }
    if (allWords && progress) {
        const progMap = new Map<number, {status: string, spelling: boolean}>();
        progress.forEach((p: any) => progMap.set(p.question_id, { status: p.status || 'learning', spelling: p.is_writing_master || false }));
        allWords.forEach(w => {
            const prog = progMap.get(w.id); const wordWithStatus = { ...w, is_writing_master: prog?.spelling || false };
            if (prog?.status === 'gold' || prog?.status === 'mastered') groups.gold.push(wordWithStatus);
            else if (prog?.status === 'silver') groups.silver.push(wordWithStatus);
            else if (prog?.status === 'bronze') groups.bronze.push(wordWithStatus);
            else groups.learning.push(wordWithStatus);
        });
    } else if (allWords) groups.learning = allWords;
    setCollectionData(groups); setLoading(false); setView('collection')
  }

  const fetchAllWordsForEdit = async () => {
    setLoading(true);
    const { data: words } = await supabase.from('kanji_questions').select('*').eq('target_user', adminTargetUser.id).order('id', { ascending: false });
    const { data: progress } = await supabase.from('user_progress').select('question_id, status').eq('user_id', adminTargetUser.id);
    if (words) {
        const statusMap = new Map<number, string>(); progress?.forEach((p: any) => statusMap.set(p.question_id, p.status));
        setAllWordsList(words.map(w => ({ ...w, currentStatus: statusMap.get(w.id) || 'learning' })));
    }
    setLoading(false);
  }

  const fetchAdminStats = async (targetId: string = adminTargetUser.id) => {
    setLoading(true)
    const { count: total } = await supabase.from('kanji_questions').select('*', { count: 'exact', head: true }).eq('target_user', targetId)
    const { data: progress } = await supabase.from('user_progress').select('status, mistake_count, is_writing_master, question_id, kanji_questions(kanji, reading, okurigana)').eq('user_id', targetId)
    const ranks = { learning: 0, bronze: 0, silver: 0, gold: 0 }; let weakWordsList: any[] = []; let checkWordsList: any[] = [];

    progress?.forEach((p: any) => {
        if (p.status === 'mastered' || p.status === 'gold') {
            ranks.gold++; if (!p.is_writing_master && p.kanji_questions) checkWordsList.push({ id: p.question_id, word: p.kanji_questions.kanji, meaning: getFullReading(p.kanji_questions.reading, p.kanji_questions.okurigana) });
        } else if (p.status === 'silver') ranks.silver++; else if (p.status === 'bronze') ranks.bronze++; else ranks.learning++;
        if (p.mistake_count > 0 && p.kanji_questions) weakWordsList.push({ word: p.kanji_questions.kanji, meaning: getFullReading(p.kanji_questions.reading, p.kanji_questions.okurigana), mistakes: p.mistake_count });
    });

    ranks.learning = Math.max(0, (total || 0) - ranks.gold - ranks.silver - ranks.bronze); weakWordsList.sort((a, b) => b.mistakes - a.mistakes);
    const now = new Date(); const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(now.getDate() - 30);
    const { data: logData } = await supabase.from('daily_logs').select('*').eq('user_id', targetId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: true })
    
    const graphData = logData?.map(l => {
        let totalCorrect = l.count || 0;
        if (l.details && Array.isArray(l.details)) totalCorrect = l.details.filter((d: any) => d.result === 'correct' || d.result === 'done').length;
        return { date: l.date.slice(5).replace('-', '/'), count: totalCorrect };
    }) || []
    
    const pieData = [{ name: `未習得 (${ranks.learning})`, value: ranks.learning, fill: PIE_COLORS[0] }, { name: `ブロンズ (${ranks.bronze})`, value: ranks.bronze, fill: PIE_COLORS[1] }, { name: `シルバー (${ranks.silver})`, value: ranks.silver, fill: PIE_COLORS[2] }, { name: `ゴールド (${ranks.gold})`, value: ranks.gold, fill: PIE_COLORS[3] }]
    const latestLog = logData && logData.length > 0 ? logData[logData.length - 1] : null; setEditStreak(latestLog ? (latestLog.streak || 0) : 0);
    setStats({ total: total || 0, mastered: ranks.gold, ranks, weakWords: weakWordsList, checkWords: checkWordsList, recentLogs: [...(logData || [])].reverse(), graphData, pieData })
    
    const { data: challenge } = await supabase.from('challenge_settings').select('*').eq('target_user_id', targetId).single()
    if (challenge) setChallengeSettings({ mode: challenge.mode || 'auto', selected_ids: challenge.selected_ids || [], auto_count: challenge.auto_count || 10, quest_count: challenge.quest_count || 5, special_quest_count: challenge.special_quest_count || 10, challenge_quest_count: challenge.challenge_quest_count || 8, reward_goal_days: challenge.reward_goal_days || 14, reward_text: challenge.reward_text || '好きなおやつ' })
    else setChallengeSettings({ mode: 'auto', selected_ids: [], auto_count: 10, quest_count: 5, special_quest_count: 10, challenge_quest_count: 8, reward_goal_days: 14, reward_text: '好きなおやつ' })
    setLoading(false); setView('admin')
  }

  const handleCheckResult = async (wordId: number, isCorrect: boolean) => {
    if (isCorrect) await supabase.from('user_progress').update({ is_writing_master: true }).eq('user_id', adminTargetUser.id).eq('question_id', wordId);
    else {
        const { data } = await supabase.from('user_progress').select('mistake_count').eq('user_id', adminTargetUser.id).eq('question_id', wordId).single();
        await supabase.from('user_progress').update({ status: 'silver', mistake_count: (data?.mistake_count || 0) + 1 }).eq('user_id', adminTargetUser.id).eq('question_id', wordId);
    }
    await fetchAdminStats(adminTargetUser.id);
  }

  const handleSaveStreak = async () => {
    const today = getTodayJST();
    const { data: cur } = await supabase.from('daily_logs').select('*').eq('user_id', adminTargetUser.id).eq('date', today).limit(1).single();
    if (cur) await supabase.from('daily_logs').update({ streak: editStreak }).eq('id', cur.id);
    else await supabase.from('daily_logs').insert([{ user_id: adminTargetUser.id, date: today, count: 0, is_completed: false, streak: editStreak }]);
    alert(`${adminTargetUser.name.split(' ')[0]}の連続日数を ${editStreak}日 に修正しました！`);
    if (adminTargetUser.id === currentUser.id) setDailyProgress(prev => ({...prev, streak: editStreak}));
    fetchAdminStats(adminTargetUser.id);
  }

  const fetchReviewCandidates = async () => {
    const { data: allWords } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.id);
    const { data: progress } = await supabase.from('user_progress').select('*').eq('user_id', currentUser.id);
    if (!allWords || !progress) return;
    const now = new Date().getTime();
    setReviewCandidates(progress.map((p: any) => {
      const word = allWords.find(w => w.id === p.question_id); if (!word) return null;
      const diffDays = (now - new Date(p.last_reviewed_at || new Date()).getTime()) / (1000 * 60 * 60 * 24); 
      if (diffDays < 1) return null;
      return { ...word, riskScore: diffDays * ((p.mistake_count || 0) + 1) };
    }).filter(i => i !== null).sort((a, b) => b!.riskScore - a!.riskScore).slice(0, 3) as KanjiWord[]);
  }

  const sendLineToChild = async (msg: string) => {
    if (!confirm('LINE通知を送りますか？')) return;
    try { 
        const res = await fetch('/api/line/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
        if (!res.ok) alert("LINE通知の送信に失敗しました🐶💦"); else alert('送信しました！'); 
    } catch(e) { alert('送信失敗（通信エラー）: ' + e); }
  }

  const saveChildComment = async () => { 
    if (!childCommentInput.trim()) return alert("一言でいいから何か書いてね！🐶");
    await supabase.from('daily_logs').update({ child_comment: childCommentInput }).eq('user_id', currentUser.id).eq('date', getTodayJST()); 
    alert('感想を送ったよ！明日も頑張ろう！'); 
    try { await fetch('/api/line/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `【${currentUser.name}】から日記が届いたよ！\n\n「${childCommentInput}」\n\nアプリを開いて返信してあげてね！🐶` }) }); } catch (e) {}
    setChildCommentInput(''); checkDailyProgress(); setView('menu');
  }

  const saveParentReply = async (logId: number) => { 
    if (!parentReplyInput.trim()) return; 
    try {
        const { data: latestLog } = await supabase.from('daily_logs').select('parent_reply').eq('id', logId).single();
        const newReply = latestLog?.parent_reply ? `${latestLog.parent_reply}\n\n${parentReplyInput}` : parentReplyInput;
        await supabase.from('daily_logs').update({ parent_reply: newReply }).eq('id', logId); 
        const res = await fetch('/api/line/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `パパ・ママからお返事が届いたよ！\n\n「${parentReplyInput}」\n\nアプリを見てみてね！✨` }) });
        if (!res.ok) alert("お返事を保存しました！✨\n（LINE通知は失敗しました）"); else alert("返信しました！（通知も送りました）");
    } catch (e) { alert("エラーが発生しました: " + e); }
    setEditingLogId(null); setParentReplyInput(''); fetchAdminStats(adminTargetUser.id);
  }

  const handleAddWord = async () => { 
      if (!newWord.kanji || !newWord.reading) return alert("必須だワン！"); 
      setLoading(true); 
      const payload = { 
          ...newWord, 
          target_user: adminTargetUser.id, 
          stroke_count: newWord.stroke_count ? parseInt(newWord.stroke_count) : null,
          usage_example: newWord.usage_example || null,
          origin_logic: newWord.origin_logic || null
      };
      await supabase.from('kanji_questions').insert([payload]); 
      setLoading(false); alert(`${adminTargetUser.name.split(' ')[0]}用に追加したワン！`); 
      setNewWord({ kanji: '', reading: '', okurigana: '', sentence: '', emoji: '📝', category: 'general', stroke_count: '', stroke_data_url: '', usage_example: '', origin_logic: '' });
      fetchAllWordsForEdit();
  }
  
  const handleUpdateCategory = async (id: number, newCategory: string) => { await supabase.from('kanji_questions').update({ category: newCategory }).eq('id', id); setAllWordsList(allWordsList.map(w => w.id === id ? { ...w, category: newCategory } : w)); }
  const handleDeleteWord = async (id: number) => { if (!confirm('削除しますか？')) return; await supabase.from('kanji_questions').delete().eq('id', id); setAllWordsList(allWordsList.filter(w => w.id !== id)); }
  const handleAddTip = async () => { if (!newTip) return; const table = tipType === 'brother' ? 'minecraft_tips' : 'school_tips'; await supabase.from(table).insert([{ content: newTip }]); alert('追加！'); setNewTip('') }
  const handleParentChallengeUpdate = async (id: number) => {
    let newIds = challengeSettings.selected_ids.includes(id) ? challengeSettings.selected_ids.filter(i => i !== id) : [...challengeSettings.selected_ids, id]
    setChallengeSettings({ ...challengeSettings, selected_ids: newIds })
  }
  const toggleMasterStatus = async (wordId: number, currentStatus: string | undefined) => {
      if (currentStatus === 'gold') {
          await supabase.from('user_progress').delete().eq('user_id', adminTargetUser.id).eq('question_id', wordId);
          setAllWordsList(prev => prev.map(w => w.id === wordId ? { ...w, currentStatus: 'learning' } : w));
      } else {
          const { error } = await supabase.from('user_progress').upsert({ user_id: adminTargetUser.id, question_id: wordId, status: 'gold', mistake_count: 0, last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id, question_id' });
          if (error) { alert(`エラー: ${error.message}`); return; }
          setAllWordsList(prev => prev.map(w => w.id === wordId ? { ...w, currentStatus: 'gold' } : w));
      }
      fetchAdminStats(adminTargetUser.id);
  }

  const startGame = async (selectedMode: 'daily' | 'free' | 'weekend' | 'parent_challenge' | 'rick_challenge' | 'revenge') => {
    const today = getTodayJST();
    if (dailyProgress.date !== today) setDailyProgress({ id: 0, date: today, count: 0, is_completed: false, details: [] });
    setLoading(true); setMode(selectedMode); setRewardTip(null); setMistakeCount(0); setMessage(''); setShowRick(false); setIsProcessing(false); setIsTransitioning(false); setCompleteBonusTip(null); setFeedbackMsg(null);
    stopSpeaking(); 

    let QUEST_LIMIT = challengeSettings.quest_count || 5; 
    if (selectedMode === 'weekend') QUEST_LIMIT = challengeSettings.special_quest_count || 10; 
    else if (selectedMode === 'parent_challenge' || selectedMode === 'rick_challenge') QUEST_LIMIT = challengeSettings.challenge_quest_count || 8; 
    else if (selectedMode === 'free') QUEST_LIMIT = 9999; 
    setCurrentGameGoal(QUEST_LIMIT);

    if (selectedMode === 'weekend') { setWeekendPhase(1); setWeekendTips([]); setBossHp(QUEST_LIMIT); } 
    if (selectedMode === 'rick_challenge') {
        const { data: allWords } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.id)
        const { data: weakData } = await supabase.from('user_progress').select('question_id').eq('user_id', currentUser.id).order('mistake_count', { ascending: false }).limit(QUEST_LIMIT)
        const weakIds = weakData?.map((w: any) => w.question_id) || []
        let queue: KanjiWord[] = []
        if (allWords) { queue = allWords.filter(w => weakIds.includes(w.id)); if (queue.length < QUEST_LIMIT) queue = [...queue, ...allWords.filter(w => !weakIds.includes(w.id)).sort(() => 0.5 - Math.random()).slice(0, QUEST_LIMIT - queue.length)]; }
        setQuestQueue(queue); setCurrentIndex(0); setRickStep(0); setView('rick_challenge'); setLoading(false); return;
    }

    const { data: allWords } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.id)
    if (!allWords || !allWords.length) { alert('漢字データがありません！保護者メニューから追加してください。'); setLoading(false); return }
    
    let queue: KanjiWord[] = []
    if (selectedMode === 'revenge') {
        const { data: weakData } = await supabase.from('user_progress').select('question_id').eq('user_id', currentUser.id).gt('mistake_count', 0).order('mistake_count', { ascending: false }).limit(challengeSettings.quest_count || 5)
        const worstIds = weakData?.map((w: any) => w.question_id) || []
        const todayIncorrectWords = dailyProgress.details?.filter(d => d.result === 'incorrect').map(d => d.word) || [];
        queue = allWords.filter(w => worstIds.includes(w.id) || todayIncorrectWords.includes(w.kanji)).sort(() => 0.5 - Math.random())
        if (queue.length === 0) { alert('復習する漢字がないよ！'); setLoading(false); return; }
        if (queue.length > challengeSettings.quest_count) queue = queue.slice(0, challengeSettings.quest_count);
    }
    else if (selectedMode === 'parent_challenge') {
        const { data: setting } = await supabase.from('challenge_settings').select('*').eq('target_user_id', currentUser.id).single()
        if (setting?.mode === 'manual' && setting.selected_ids.length > 0) queue = allWords.filter(w => setting.selected_ids.includes(w.id))
        else {
            const { data: weakData } = await supabase.from('user_progress').select('question_id, mistake_count').eq('user_id', currentUser.id).order('mistake_count', { ascending: false }).limit(setting?.auto_count || 10)
            const weakIds = weakData?.map((w: any) => w.question_id) || []
            queue = allWords.filter(w => weakIds.includes(w.id))
            if (queue.length < (setting?.auto_count || 10)) queue = [...queue, ...allWords.filter(w => !weakIds.includes(w.id)).sort(() => 0.5 - Math.random()).slice(0, (setting?.auto_count || 10) - queue.length)]
        }
        if (queue.length === 0) queue = [...allWords].sort(() => 0.5 - Math.random()).slice(0, QUEST_LIMIT)
    } 
    else if (selectedMode === 'daily') {
      const { data: prog } = await supabase.from('user_progress').select('question_id, status, last_reviewed_at').eq('user_id', currentUser.id)
      const masteredMap = new Map<number, string>(); prog?.forEach((p: any) => { if (p.status === 'gold' || p.status === 'mastered') masteredMap.set(p.question_id, p.last_reviewed_at) })
      const unmastered = allWords.filter(w => !masteredMap.has(w.id)).sort(() => 0.5 - Math.random())
      const reviews = allWords.filter(w => masteredMap.has(w.id)).sort((a, b) => new Date(masteredMap.get(a.id)||0).getTime() - new Date(masteredMap.get(b.id)||0).getTime())
      queue = [...unmastered]; if (queue.length < QUEST_LIMIT) queue = [...queue, ...reviews.slice(0, QUEST_LIMIT - queue.length)];
      queue = queue.slice(0, QUEST_LIMIT).sort(() => 0.5 - Math.random())
    } 
    else queue = [...allWords].sort(() => 0.5 - Math.random()).slice(0, selectedMode === 'weekend' ? QUEST_LIMIT : undefined) 

    setQuestQueue(queue); setCurrentIndex(0); prepareQuestion(queue[0], allWords, selectedMode === 'weekend' ? 'weekend' : selectedMode, 1);
    setView('game'); setLoading(false)
  }

  const prepareQuestion = (word: KanjiWord, allWords: KanjiWord[], modeOverride?: string, phaseOverride?: number) => {
    setUserAnswer(''); setMessage(''); setShowRick(false); setMistakeCount(0); setShowHint(false); setShowFlashAnswer(false); setIsProcessing(false); setIsTransitioning(false); setFeedbackMsg(null);
    const cMode = modeOverride || mode; const cPhase = phaseOverride || weekendPhase
    let nextLangMode: 'kanji_to_read' | 'read_to_kanji' = 'kanji_to_read';
    
    if (cMode === 'weekend') {
        if (cPhase === 1) { nextLangMode = 'kanji_to_read'; setInputMode('quiz') } 
        else if (cPhase === 2) { nextLangMode = 'read_to_kanji'; setInputMode('quiz') } 
        else if (cPhase === 3) { nextLangMode = 'kanji_to_read'; setInputMode('typing') } 
    } else if (selectedInputMode.includes('typing')) { 
        nextLangMode = 'kanji_to_read'; setInputMode('typing')
    } else { 
        nextLangMode = selectedInputMode === 'quiz_kanji' ? 'read_to_kanji' : 'kanji_to_read'; setInputMode('quiz')
    }
    setLangMode(nextLangMode);
    
    if (cMode === 'weekend' && cPhase === 1) { speakWord(getFullReading(word.reading, word.okurigana)); }
    else if (nextLangMode === 'read_to_kanji') { speakWord(getFullReading(word.reading, word.okurigana)); }

    const others = allWords.filter(w => w.id !== word.id).sort(() => 0.5 - Math.random()).slice(0, 3)
    setOptions([word, ...others].sort(() => 0.5 - Math.random()))
  }

  const checkAnswer = async (ans: string) => {
    if (isProcessing || showRick) return;
    setIsProcessing(true);
    const cur = questQueue[currentIndex]; 
    
    let cor = '';
    if (langMode === 'read_to_kanji') {
        cor = cur.kanji;
    } else {
        if (inputMode === 'typing') {
            cor = getFullReading(cur.reading, cur.okurigana);
        } else {
            cor = formatReading(cur.reading, cur.okurigana);
        }
    }
    
    let isCorrect = false;
    if (inputMode === 'typing') {
        const normalize = (str: string) => str.replace(/[\u30a1-\u30f6]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60)).replace(/[\u3000\s]/g, '');
        isCorrect = normalize(ans) === normalize(cor) && normalize(ans) !== '';
    } else isCorrect = ans === cor;

    const newLog: ActivityLog = { time: new Date().toLocaleTimeString('ja-JP'), word: cur.kanji, mode: MODE_NAMES[mode] || mode, result: isCorrect ? 'correct' : 'incorrect' }
    const updatedDetails = [...(dailyProgress.details || []), newLog];

    if (isCorrect) {
      playSound('correct'); setMessage('正解！すごい！🎉'); setRickComment("やったワン！"); setFeedbackMsg(null);
      
      const fullReading = getFullReading(cur.reading, cur.okurigana);
      const textToSpeak = cur.origin_logic ? `${fullReading}。${cur.origin_logic}` : fullReading;
      speakWord(textToSpeak);

      setShowRick(true); confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } }); setShowHint(true); 
      if (mode === 'weekend') { setBossHp(prev => Math.max(0, prev - 1)); setIsBossAttacked(true); setTimeout(() => setIsBossAttacked(false), 500); }
      await updateProgress(cur.id, true, updatedDetails)
    } else {
      playSound('wrong'); const nextMistakeCount = mistakeCount + 1; setMistakeCount(nextMistakeCount); setShowHint(true); setIsProcessing(false);
      
      if (inputMode === 'quiz') {
          const selectedWord = options.find(o => o.kanji === ans || formatReading(o.reading, o.okurigana) === ans || getFullReading(o.reading, o.okurigana) === ans);
          if (selectedWord && selectedWord.id !== cur.id) {
              if (langMode === 'read_to_kanji') {
                  setFeedbackMsg(<>❌ 選んだ「<span className="font-black text-rose-600">{selectedWord.kanji}</span>」は「<span className="font-black text-rose-600">{formatReading(selectedWord.reading, selectedWord.okurigana)}</span>」だよ！</>);
              } else {
                  setFeedbackMsg(<>❌ 選んだ「<span className="font-black text-rose-600">{formatReading(selectedWord.reading, selectedWord.okurigana)}</span>」は「<span className="font-black text-rose-600">{selectedWord.kanji}</span>」だよ！</>);
              }
          }
      }

      if (mode === 'weekend' && weekendPhase === 3 && nextMistakeCount >= 3) { setShowFlashAnswer(true); setTimeout(() => { setShowFlashAnswer(false); }, 3000); return; }
      await updateProgress(cur.id, false, updatedDetails);
      if (nextMistakeCount >= 3 && !(mode === 'weekend' && weekendPhase === 3)) { setMessage(`残念... 正解は「${cor}」`); setShowRick(true) } else { 
        if (inputMode === 'typing' || (mode === 'weekend' && weekendPhase === 3)) {
          if (nextMistakeCount === 1) { setMessage('ヒント：絵と文字が出たよ！👀'); } else if (nextMistakeCount === 2) { setMessage('答えを一瞬だけ見せるよ！👀'); setShowFlashAnswer(true); setTimeout(() => { setShowFlashAnswer(false); setMessage('ヒント：絵と文字を見て思い出して！'); }, 3000); }
        }
      }
    }
  }

  const updateProgress = async (id: number, correct: boolean, updatedDetails: ActivityLog[]) => {
    const today = getTodayJST();
    const { data: currentData } = await supabase.from('user_progress').select('status, mistake_count, is_writing_master').eq('user_id', currentUser.id).eq('question_id', id).single()
  
    let newStatus = currentData?.status || 'learning'; let newMistake = currentData?.mistake_count || 0;
    if (correct) {
        if (newStatus === 'learning') newStatus = 'bronze'; else if (newStatus === 'bronze') newStatus = 'silver'; else if (newStatus === 'silver') newStatus = 'gold';
    } else {
        newMistake += 1;
        if (newStatus === 'gold' || newStatus === 'mastered') newStatus = 'silver'; else if (newStatus === 'silver') newStatus = 'bronze'; else newStatus = 'learning';
    }

    const isWritingMode = ((mode === 'weekend') ? inputMode : (selectedInputMode === 'typing_read' ? 'typing' : 'quiz')) === 'typing';
    const newWritingMaster = (correct && isWritingMode) ? true : (currentData?.is_writing_master || false);

    await supabase.from('user_progress').upsert({ user_id: currentUser.id, question_id: id, status: newStatus, mistake_count: newMistake, is_writing_master: newWritingMaster, last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id, question_id' })
  
    const newCount = correct ? dailyProgress.count + 1 : dailyProgress.count;
    const comp = dailyProgress.is_completed === true ? true : (mode === 'daily' && updatedDetails.filter(d => d.mode === MODE_NAMES['daily'] && (d.result === 'correct' || d.result === 'done')).length >= currentGameGoal);
    const logData = { count: newCount, is_completed: comp, details: updatedDetails };

    if (dailyProgress.id !== 0) await supabase.from('daily_logs').update(logData).eq('id', dailyProgress.id);
    else { const { data: inserted } = await supabase.from('daily_logs').upsert({ user_id: currentUser.id, date: today, streak: dailyProgress.streak || 0, ...logData }, { onConflict: 'user_id, date' }).select().single(); if (inserted) { setDailyProgress(prev => ({ ...prev, id: inserted.id })); } }
    setDailyProgress(prev => ({ ...prev, ...logData })); 
    if (comp && !dailyProgress.is_completed && mode === 'daily') { fetchMonthlyLogs(); fetchComparison(); }
  }

  const nextQuestion = async () => {
    setIsTransitioning(true);
    stopSpeaking(); 
    setTimeout(async () => {
        const next = currentIndex + 1
        if (view === 'rick_challenge') {
           if (next >= questQueue.length) { 
               const finishLog: ActivityLog = { time: new Date().toLocaleTimeString('ja-JP'), word: `${MODE_NAMES['rick_challenge']} クリア！`, mode: MODE_NAMES['rick_challenge'], result: 'done' };
               const updatedDetails = [...(dailyProgress.details || []), finishLog];
               if (dailyProgress.id !== 0) await supabase.from('daily_logs').update({ details: updatedDetails }).eq('id', dailyProgress.id); 
               else await supabase.from('daily_logs').update({ details: updatedDetails }).eq('user_id', currentUser.id).eq('date', getTodayJST()); 
               setDailyProgress({ ...dailyProgress, details: updatedDetails } as any); setView('result'); confetti({ particleCount: 300 }); return 
           }
           setCurrentIndex(next); setRickStep(0); setIsTransitioning(false); return;
        }
        if (mode === 'weekend') {
          if (next >= questQueue.length) {
            if (weekendPhase < 3) { 
                const nextP = (weekendPhase + 1) as 1 | 2 | 3; setWeekendPhase(nextP); setCurrentIndex(0); setBossHp(currentGameGoal); alert(`Round ${weekendPhase} クリア！\n次は Round ${nextP} だワン！🐶`); 
                const { data: all } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.id); prepareQuestion(questQueue[0], all || [], 'weekend', nextP) 
            } else { playSound('clear'); setView('result'); confetti({ particleCount: 500, spread: 150, origin: { y: 0.6 } }); const updatedDetails = [...(dailyProgress.details || []), { time: new Date().toLocaleTimeString('ja-JP'), word: 'BOSS DEFEATED', mode: MODE_NAMES['weekend'], result: 'done' }]; if (dailyProgress.id !== 0) await supabase.from('daily_logs').update({ details: updatedDetails }).eq('id', dailyProgress.id); setDailyProgress({ ...dailyProgress, details: updatedDetails } as any); const { data } = await supabase.from(currentUser.defaultTipTable).select('*'); let t = []; if (data?.length) { t = [...data].sort(() => 0.5 - Math.random()).slice(0, 3).map(i => i.content); const defaults = currentUser.id === 'brother' ? DEFAULT_TIPS_BROTHER : DEFAULT_TIPS_SISTER; while(t.length < 3) t.push(defaults[Math.floor(Math.random() * defaults.length)]) } else t = currentUser.id === 'brother' ? DEFAULT_TIPS_BROTHER : DEFAULT_TIPS_SISTER; setWeekendTips(t); }
          } else { setCurrentIndex(next); const { data: all } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.id); prepareQuestion(questQueue[next], all || []) }
          return
        }
        if (mode === 'revenge') {
            if (next >= questQueue.length) { setCurrentIndex(0); const { data: all } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.id); prepareQuestion(questQueue[0], all || []); alert('一周したワン！まだまだ行くよ～！🐶'); } 
            else { setCurrentIndex(next); const { data: all } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.id); prepareQuestion(questQueue[next], all || []); }
            setIsTransitioning(false); return;
        }
        if (next >= questQueue.length) {
            if (mode === 'daily') {
                playSound('clear'); const { data: yLog } = await supabase.from('daily_logs').select('streak').eq('user_id', currentUser.id).eq('date', getJSTDateString(new Date(Date.now() - 86400000))).single();
                const currentStreak = (yLog?.streak || 0) + 1;
                await supabase.from('daily_logs').update({ count: dailyProgress.count, is_completed: true, streak: currentStreak }).eq('user_id', currentUser.id).eq('date', getTodayJST());
                setDailyProgress({ ...dailyProgress, is_completed: true, streak: currentStreak } as any); setView('result'); confetti({ particleCount: 300, spread: 100, origin: { y: 0.6 } }); fetchMonthlyLogs(); fetchComparison(); 
                const { data: tipsData } = await supabase.from(currentUser.defaultTipTable).select('*'); const availableTips = tipsData?.map(t => t.content) || (currentUser.id === 'brother' ? DEFAULT_TIPS_BROTHER : DEFAULT_TIPS_SISTER);
                const goalDays = challengeSettings.reward_goal_days || 14; const rewardWord = challengeSettings.reward_text || '好きなおやつ';
                let rewardText = ""; let multiplier = 1; let specialMessage = "";
                if (currentStreak === goalDays) { specialMessage = `🎊 目標の${goalDays}日達成！すごい！！`; rewardText = `🎁 ${rewardWord} をGET！`; multiplier = 5; } else if (currentStreak % 7 === 0) { specialMessage = `🌈 ${currentStreak}日連続！その調子！`; rewardText = "✨ 豆知識 2倍盛り！"; multiplier = 2; } else if (currentStreak % 3 === 0) { specialMessage = `⚡ ${currentStreak}日連続！いい感じ！`; rewardText = "🍬 ちょっといいことあるかも？"; }
                const selectedTips = []; for (let i = 0; i < multiplier; i++) selectedTips.push(availableTips[Math.floor(Math.random() * availableTips.length)]);
                if (currentStreak === goalDays) setRewardTip(rewardText); else setRewardTip((specialMessage ? `${specialMessage}\n${rewardText}\n\n` : "") + selectedTips.map(t => `・${t}`).join('\n'));
            }
            else {
                const finishLog: ActivityLog = { time: new Date().toLocaleTimeString('ja-JP'), word: `${MODE_NAMES[mode] || mode} クリア！`, mode: MODE_NAMES[mode] || mode, result: 'done' };
                const updatedDetails = [...(dailyProgress.details || []), finishLog];
                if (dailyProgress.id !== 0) await supabase.from('daily_logs').update({ details: updatedDetails }).eq('id', dailyProgress.id);
                else await supabase.from('daily_logs').update({ details: updatedDetails }).eq('user_id', currentUser.id).eq('date', getTodayJST());
                setDailyProgress({ ...dailyProgress, details: updatedDetails } as any); setView('result');
            }
        }
        else if (next >= questQueue.length) startGame('free')
        else { setCurrentIndex(next); const { data: all } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.id); prepareQuestion(questQueue[next], all || []) }
    }, 500);
  }

  const renderCalendar = () => {
    const year = calendarDate.getFullYear(); const month = calendarDate.getMonth();
    const dInM = new Date(year, month + 1, 0).getDate(); const fDay = new Date(year, month, 1).getDay();
    const days = [];
    const weekLabels = ['日', '月', '火', '水', '木', '金', '土'].map(w => (<div key={w} className="text-center text-xs font-bold text-stone-400 mb-1">{w}</div>));
    for (let i = 0; i < fDay; i++) days.push(<div key={`e-${i}`} className="h-10 w-10"></div>);
    for (let d = 1; d <= dInM; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = monthlyLogs.find(l => l.date === dateStr); const isToday = dateStr === getTodayJST();
      days.push(
        <div key={d} onClick={() => setSelectedLogDate(dateStr)} className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold relative cursor-pointer hover:bg-stone-100 ${isToday ? currentUser.border + ' border-2 ' + currentUser.light : 'bg-white shadow-sm'}`}>
          <span className="text-stone-600">{d}</span>
          {log?.is_completed && <img src="/Rick.png" alt="Rick" className="absolute inset-0 w-8 h-8 object-cover rounded-full opacity-90 animate-in zoom-in shadow-md" />}
        </div>
      );
    }
    return (
        <div className="bg-stone-50 p-4 rounded-xl shadow-inner border-2 border-stone-100">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))} className="text-stone-400 hover:text-stone-600 font-bold px-3 py-1 bg-white rounded-lg active:scale-95 transition shadow-sm">&lt;</button>
                <h3 className="text-center font-bold text-stone-600">{year}年 {month + 1}月</h3>
                <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} className="text-stone-400 hover:text-stone-600 font-bold px-3 py-1 bg-white rounded-lg active:scale-95 transition shadow-sm">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-2">{weekLabels}{days}</div>
        </div>
    );
  };
  
  const toggleCardReveal = (id: number) => { if (revealedCards.includes(id)) setRevealedCards(revealedCards.filter(rid => rid !== id)); else setRevealedCards([...revealedCards, id]) }
  const toggleReviewReveal = (id: number) => { if (reviewRevealed.includes(id)) setReviewRevealed(reviewRevealed.filter(rid => rid !== id)); else setReviewRevealed([...reviewRevealed, id]) }

  if (view === 'admin') {
    const selectedLog = selectedLogDate ? monthlyLogs.find(l => l.date === selectedLogDate) : null;
    return (
      <div className="min-h-screen bg-stone-100 p-4 font-sans text-stone-800">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4"><button onClick={() => { stopSpeaking(); setView('menu'); }} className="text-stone-500 font-bold bg-white px-4 py-2 rounded-full shadow-sm hover:bg-stone-50 transition">← もどる</button><h2 className="text-xl font-black tracking-wider text-stone-700">保護者メニュー</h2></div>
          <div className="flex justify-center gap-3 mb-6">
            {USERS.map(u => (<button key={u.id} onClick={() => { setAdminTargetUser(u); fetchAdminStats(u.id); }} className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${adminTargetUser.id === u.id ? `bg-gradient-to-r ${u.hue} text-white shadow-lg scale-105 ring-2 ring-white/50` : 'bg-white text-stone-400 shadow-sm hover:bg-stone-50'}`}>{u.name.split(' ')[0]}</button>))}
          </div>
          <div className="flex bg-white rounded-xl p-2 mb-6 shadow-sm overflow-x-auto border-2 border-stone-200">
            <button onClick={() => setAdminTab('stats')} className={`flex-1 py-2 px-2 whitespace-nowrap text-sm font-bold rounded-lg ${adminTab === 'stats' ? 'bg-orange-100 text-orange-700' : 'text-stone-500'}`}>📊 成績</button>
            <button onClick={() => { setAdminTab('challenge'); fetchAllWordsForEdit(); }} className={`flex-1 py-2 px-2 whitespace-nowrap text-sm font-bold rounded-lg ${adminTab === 'challenge' ? 'bg-red-100 text-red-700' : 'text-stone-500'}`}>⚔️ 挑戦状</button>
            <button onClick={() => setAdminTab('add_word')} className={`flex-1 py-2 px-2 whitespace-nowrap text-sm font-bold rounded-lg ${adminTab === 'add_word' ? 'bg-sky-100 text-sky-700' : 'text-stone-500'}`}>➕ 漢字追加</button>
            <button onClick={() => { setAdminTab('manage'); fetchAllWordsForEdit(); }} className={`flex-1 py-2 px-2 whitespace-nowrap text-sm font-bold rounded-lg ${adminTab === 'manage' ? 'bg-indigo-100 text-indigo-700' : 'text-stone-500'}`}>✏️ 編集</button>
          </div>
          
          {adminTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-stone-100 h-64 flex flex-col justify-center items-center">
                  <h3 className="font-bold text-stone-700 mb-2 w-full text-left">📈 習得率</h3>
                  <div className="w-full h-full flex flex-row items-center">
                      <div className="w-2/3 h-full relative" style={{ minHeight: '200px' }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" startAngle={90} endAngle={-270}>{stats.pieData.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}<Label value={`${Math.round((stats.mastered / stats.total) * 100) || 0}%`} position="center" className="text-xl font-bold" fill="#374151" /></Pie></PieChart></ResponsiveContainer></div>
                      <div className="w-1/3 flex flex-col justify-center gap-2 text-[11px] text-stone-600 font-bold">{stats.pieData.map((entry, index) => (<div key={index} className="flex items-center gap-1"><div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: PIE_COLORS[index] }}></div><span>{entry.name}</span></div>))}</div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-stone-100">
                  <h3 className="font-bold text-stone-700 mb-4">🔥 苦手ワースト</h3>
                  <ul className="space-y-2">{stats.weakWords.slice(0, showAllWeakWords ? undefined : 5).map((w, i) => (<li key={i} className="flex justify-between items-center text-sm border-b border-stone-100 pb-1"><span className="font-bold text-stone-800">{i+1}. {w.word} <span className="text-xs text-stone-500">({w.meaning})</span></span><span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">{w.mistakes}回</span></li>))}</ul>
                  {stats.weakWords.length > 5 && <button onClick={() => setShowAllWeakWords(!showAllWeakWords)} className="w-full text-center text-xs text-sky-600 mt-3 font-bold bg-sky-50 py-2 rounded-lg">{showAllWeakWords ? '閉じる ▲' : 'もっと見る ▼'}</button>}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-100 mb-6">
                <h3 className="font-bold text-stone-700 mb-4 border-b border-stone-200 pb-2">📅 親子交換日記</h3>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                  {stats.recentLogs.filter(l => l.child_comment).map(log => (
                    <div key={log.id} className="bg-amber-50 p-4 rounded-xl text-sm border border-amber-100 relative">
                      <div className="absolute top-2 right-3 text-stone-400 text-[10px] font-bold">{log.date}</div>
                      <p className="font-bold text-stone-800 mb-3 text-base leading-relaxed">👦👧 「{log.child_comment}」</p>
                      {log.parent_reply && (<p className="text-orange-700 border-t border-amber-200 pt-2 whitespace-pre-wrap font-medium">👨👩 「{log.parent_reply}」</p>)}
                      <div className="mt-3">
                        {editingLogId === log.id ? (<div className="flex gap-2"><input className="border-2 border-orange-200 rounded-lg px-3 py-2 flex-1 outline-none focus:border-orange-400" value={parentReplyInput} onChange={e => setParentReplyInput(e.target.value)} placeholder="お返事を書く..." /><button onClick={() => saveParentReply(log.id)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition">送る</button></div>) : (<button onClick={() => { setEditingLogId(log.id); setParentReplyInput(''); }} className="text-xs text-orange-600 font-bold underline bg-white/50 px-2 py-1 rounded">✏️ お返事を書く</button>)}
                      </div>
                    </div>
                  ))}
                  {stats.recentLogs.filter(l => l.child_comment).length === 0 && <p className="text-stone-400 text-sm text-center py-4">まだ日記はありません。</p>}
                </div>
              </div>
              <div className="mb-6 w-full bg-white rounded-2xl shadow-sm border-2 border-stone-100 p-6">
                {renderCalendar()}
              </div>
            </div>
          )}

          {adminTab === 'add_word' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-100 animate-in fade-in">
              <h3 className="font-black text-sky-700 mb-6 flex items-center gap-2">➕ 新しい漢字の登録</h3>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-stone-500 mb-1 block">漢字 <span className="text-red-500">*</span></label><input className="w-full border-2 border-stone-200 p-3 rounded-xl font-black text-2xl outline-none focus:border-sky-400 bg-stone-50" placeholder="例: 漢" value={newWord.kanji} onChange={e => setNewWord({...newWord, kanji: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-stone-500 mb-1 block">読み <span className="text-red-500">*</span></label><input className="w-full border-2 border-stone-200 p-3 rounded-xl outline-none focus:border-sky-400 bg-stone-50 font-bold" placeholder="例: かん" value={newWord.reading} onChange={e => setNewWord({...newWord, reading: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-stone-500 mb-1 block">送り仮名 (あれば)</label><input className="w-full border-2 border-stone-200 p-3 rounded-xl outline-none focus:border-sky-400 bg-stone-50" placeholder="例: じる" value={newWord.okurigana} onChange={e => setNewWord({...newWord, okurigana: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-stone-500 mb-1 block">クイズ用例文</label><input className="w-full border-2 border-stone-200 p-3 rounded-xl outline-none focus:border-sky-400 bg-stone-50 text-sm" placeholder="例: □字のテスト (漢字部分を□にする)" value={newWord.sentence} onChange={e => setNewWord({...newWord, sentence: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-stone-500 mb-1 block">活用例文 (図鑑用)</label><textarea className="w-full border-2 border-stone-200 p-3 rounded-xl outline-none focus:border-sky-400 bg-stone-50 text-sm" placeholder="例: ミニチュアダックスフントのRICKを飼っている。" value={newWord.usage_example} onChange={e => setNewWord({...newWord, usage_example: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-stone-500 mb-1 block">漢字の成り立ち・ロジック</label><textarea className="w-full border-2 border-stone-200 p-3 rounded-xl outline-none focus:border-sky-400 bg-stone-50 text-sm" placeholder="例: 「食」と「司」が組み合わさっています。" value={newWord.origin_logic} onChange={e => setNewWord({...newWord, origin_logic: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-stone-500 mb-1 block">総画数</label><input type="number" className="w-full border-2 border-stone-200 p-3 rounded-xl outline-none focus:border-sky-400 bg-stone-50 font-bold" placeholder="例: 14" value={newWord.stroke_count} onChange={e => setNewWord({...newWord, stroke_count: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-stone-500 mb-1 block">学年・カテゴリ</label><select className="border-2 border-stone-200 p-3 rounded-xl w-full text-sm font-bold bg-white outline-none focus:border-sky-400" value={newWord.category} onChange={(e) => setNewWord({...newWord, category: e.target.value})}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <button onClick={handleAddWord} className="w-full bg-gradient-to-r from-sky-400 to-indigo-500 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:opacity-90 transition active:scale-95 mt-4 tracking-widest">データベースに登録！</button>
              </div>
            </div>
          )}
          
          {adminTab === 'manage' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-100">
              <h3 className="font-black text-indigo-700 mb-4">✏️ 編集・削除</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {allWordsList.map(w => (
                  <div key={w.id} className="flex items-center gap-3 p-3 border-b border-stone-100 bg-stone-50 rounded-xl mb-2 relative">
                    {w.stroke_count && <span className="absolute top-1 left-2 text-[8px] text-stone-400 font-bold">{w.stroke_count}画</span>}
                    <div className="text-3xl font-black text-stone-800">{w.kanji}</div>
                    <div className="flex-1">
                      <p className="font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded inline-block mb-1">{formatReading(w.reading, w.okurigana)}</p>
                      <p className="text-[10px] text-stone-500 line-clamp-1">{w.origin_logic ? `💡 ${w.origin_logic}` : ''}</p>
                    </div>
                    <button onClick={() => handleDeleteWord(w.id)} className="text-xs text-red-500 font-bold border-2 border-red-200 bg-white rounded-lg px-3 py-2 hover:bg-red-50 active:scale-95 transition">削除</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'challenge' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-100">
              <h3 className="font-black text-red-600 mb-4">⚔️ クエスト設定</h3>
              <div className="mb-4"><label className="text-sm font-bold block mb-1">目標日数</label><input type="number" className="border p-2 rounded w-full" value={challengeSettings.reward_goal_days} onChange={(e) => setChallengeSettings({ ...challengeSettings, reward_goal_days: Number(e.target.value) })} /></div>
              <div className="mb-6"><label className="text-sm font-bold block mb-1">ご褒美</label><input type="text" className="border p-2 rounded w-full" value={challengeSettings.reward_text} onChange={(e) => setChallengeSettings({ ...challengeSettings, reward_text: e.target.value })} /></div>
              <button onClick={() => saveChallengeSettings(challengeSettings)} className="w-full bg-red-500 text-white font-bold py-3 rounded-xl shadow-md">設定を保存</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (view === 'menu') {
    const streak = dailyProgress.streak || 0; const goal = challengeSettings.reward_goal_days || 14; const rewardName = challengeSettings.reward_text || '好きなおやつ';
    let nextRewardMsg = "";
    if (streak < goal) nextRewardMsg = `あと${goal - streak}日で${rewardName}！🎁`;
    else { const remaining = goal - (streak % goal); nextRewardMsg = (remaining === goal && streak > 0) ? `🎉 目標の${goal}日達成！${rewardName}をGET！` : `あと${remaining}日で${rewardName}！🎁`; }

    const isRickDone = dailyProgress.details?.some(d => d.mode === MODE_NAMES['rick_challenge'] && d.result === 'done'); 
    const isParentDone = dailyProgress.details?.some(d => d.mode === MODE_NAMES['parent_challenge'] && d.result === 'done'); 
    const isWeekendDone = dailyProgress.details?.some(d => d.mode === MODE_NAMES['weekend'] && d.result === 'done'); 
    const displayCount = challengeSettings.quest_count || 5;

    return (
      <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-12 px-4 pb-10 font-sans transition-colors duration-500`}>
        <div className="absolute top-4 right-4 flex space-x-2">
          {USERS.map(u => (<button key={u.id} onClick={() => setCurrentUser(u)} className={`px-4 py-1.5 rounded-full text-sm font-black transition-all duration-300 ${currentUser.id === u.id ? `bg-gradient-to-r ${u.hue} text-white shadow-lg transform scale-110 ring-2 ring-white/50` : 'bg-white/50 text-stone-400 opacity-80 hover:bg-white'}`}>{u.name.split(' ')[0]}</button>))}
        </div>

        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl mb-4 relative">
          <img src="/Rick.png" alt="Rick" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-stone-900/40 text-white text-[10px] text-center font-bold py-0.5 backdrop-blur-sm tracking-widest">ナビゲーター</div>
        </div>
        <h1 className={`text-3xl font-black ${currentUser.text} mb-2 tracking-widest drop-shadow-sm`}>毎日漢検クエスト</h1>
        
        <div className="bg-white p-1.5 rounded-2xl shadow-sm mb-6 flex gap-1 border-2 border-white/50 w-full max-w-sm">
           <button onClick={() => setSelectedInputMode('quiz_kanji')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${selectedInputMode === 'quiz_kanji' ? `${currentUser.color} text-white shadow-md scale-105` : 'text-stone-400 hover:bg-stone-50'}`}>🔘 読み→漢字(4択)</button>
           <button onClick={() => setSelectedInputMode('typing_read')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${selectedInputMode === 'typing_read' ? 'bg-stone-800 text-white shadow-md scale-105' : 'text-stone-400 hover:bg-stone-50'}`}>⌨️ 漢字→読み(入力)</button>
        </div>
        
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-5 mb-5 text-center border-b-4 border-stone-200 relative overflow-hidden">
           <div className="absolute -right-4 -top-4 text-6xl opacity-10">🔥</div>
           <p className="text-xs text-stone-400 font-bold mb-1">現在の連続クリア</p>
           <p className="text-5xl font-black text-orange-500 mb-3 tracking-tighter">{streak} <span className="text-xl">日</span></p>
           <div className="bg-orange-50 border border-orange-200 text-orange-600 font-bold py-1.5 px-4 rounded-full text-sm inline-block shadow-sm">{nextRewardMsg}</div>
        </div>

        {reviewCandidates.length > 0 && (
          <div className="w-full max-w-sm mb-6 animate-in slide-in-from-top duration-500">
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-rose-200 text-rose-700 text-xs font-bold px-3 py-1 rounded-bl-xl shadow-sm">⚠️ 要復習</div>
              <h3 className="font-bold text-rose-600 mb-3 text-sm flex items-center gap-1">Rickからの挑戦状 <span className="text-xl">🦴</span></h3>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {reviewCandidates.map(w => {
                  const isRevealed = reviewRevealed.includes(w.id)
                  return (
                    <div key={w.id} onClick={() => toggleReviewReveal(w.id)} className="min-w-[100px] h-32 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center p-2 cursor-pointer active:scale-95 transition border-b-4 border-rose-200">
                      {!isRevealed ? (
                        <div className="text-center animate-in zoom-in w-full"><p className="font-black text-stone-800 text-4xl leading-tight break-words">{w.kanji}</p><p className="font-bold text-rose-400 text-lg mt-2">?</p></div>
                      ) : (
                        <div className="text-center animate-in zoom-in w-full"><div className="text-3xl mb-1">{w.emoji}</div><p className="font-bold text-sky-600 text-xs leading-tight bg-sky-50 px-2 py-0.5 rounded">{renderReading(w.reading, w.okurigana)}</p></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-6 mb-6 relative overflow-hidden border-2 border-stone-50">
          <div className="flex items-center justify-between mb-3"><span className="text-stone-500 font-bold text-sm">📅 今日の進捗</span><span className={`text-2xl font-black ${currentUser.text}`}>{dailyProgress.count} <span className="text-base text-stone-400">/ {displayCount} 問</span></span></div>
          <div className="w-full bg-stone-100 rounded-full h-5 shadow-inner p-0.5"><div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${currentUser.hue}`} style={{ width: `${Math.min((dailyProgress.count / displayCount) * 100, 100)}%` }}></div></div>
          {dailyProgress.is_completed ? <p className="text-center text-orange-500 font-bold mt-3 animate-bounce">💮 今日のノルマ達成！えらい！</p> : <p className="text-center text-stone-400 text-xs mt-3 font-bold">目標まであと {Math.max(0, displayCount - dailyProgress.count)} 問！</p>}
        </div>
        
        <div className="space-y-3 w-full max-w-sm mb-6">
          {hasParentChallenge && (
            <button onClick={() => { if (!isParentDone) startGame('parent_challenge'); }} className={`w-full py-4 px-6 rounded-2xl font-black shadow-lg transform transition-all flex items-center justify-between ${isParentDone ? 'bg-stone-200 text-white shadow-none' : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white animate-pulse active:scale-95'}`}>
              <div className="flex items-center gap-3"><span className="text-2xl">🔥</span> <span className="tracking-wide">パパからの挑戦状</span></div>
              {isParentDone && <span className="bg-white/30 px-3 py-1 rounded-full text-xs">クリア済</span>}
            </button>
          )}

          <button onClick={() => { if (!dailyProgress.is_completed) startGame('daily'); }} className={`w-full py-5 px-6 rounded-2xl font-black shadow-xl transform transition-all flex items-center justify-between ${dailyProgress.is_completed ? 'bg-sky-200 text-white shadow-none' : `bg-gradient-to-r ${currentUser.hue} text-white hover:opacity-90 active:scale-95`}`}>
            <div className="flex items-center gap-3"><span className="text-3xl">🚀</span> <span className="text-xl tracking-wider">今日の冒険へ</span></div>
            {dailyProgress.is_completed ? <span className="bg-white/30 px-3 py-1 rounded-full text-xs">クリア済</span> : <span className="bg-white/30 px-3 py-1 rounded-full text-sm">{displayCount}問</span>}
          </button>
          
          <button onClick={() => { if (!isRickDone) startGame('rick_challenge'); }} className={`w-full py-3 px-6 rounded-2xl font-bold shadow-md transform transition-all flex items-center justify-between ${isRickDone ? 'bg-stone-200 text-white shadow-none' : 'bg-white border-2 border-stone-200 text-stone-700 hover:bg-stone-50 active:scale-95'}`}>
            <div className="flex items-center gap-3"><span className="text-xl">⚡</span> <span>Rickの挑戦 (暗記カード)</span></div>
            {isRickDone && <span className="text-xs text-stone-400">クリア済</span>}
          </button>

          <button onClick={() => startGame('weekend')} className={`w-full py-3 px-6 rounded-2xl font-bold shadow-md transform transition-all flex items-center justify-between ${isWeekendDone ? 'bg-stone-200 text-white shadow-none' : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white active:scale-95'}`}>
            <div className="flex items-center gap-3"><span className="text-xl">🏰</span> <span>週末ボスバトル</span></div>
            {isWeekendDone && <span className="bg-white/30 px-3 py-1 rounded-full text-xs">撃破済</span>}
          </button>

          <button onClick={() => startGame('revenge')} className="w-full py-4 px-6 rounded-2xl font-black shadow-md transform transition-all flex items-center justify-center bg-stone-800 text-rose-400 border-b-4 border-stone-900 hover:bg-stone-700 active:translate-y-1 active:border-b-0 tracking-widest gap-2"><span className="text-xl">💀</span> リベンジ (無限復習)</button>

          <div className="flex space-x-3 mt-4">
            <button onClick={fetchCollection} className="flex-1 bg-white border-b-4 border-emerald-500 text-emerald-600 font-black py-4 px-4 rounded-2xl shadow-sm active:translate-y-1 active:border-b-0 transition flex justify-center items-center gap-2"><span className="text-xl">📖</span> 漢字図鑑</button>
            <button onClick={() => startGame('free')} className="flex-1 bg-white border-b-4 border-sky-400 text-sky-500 font-black py-4 px-4 rounded-2xl shadow-sm active:translate-y-1 active:border-b-0 transition flex justify-center items-center gap-2"><span className="text-xl">⚔️</span> フリー</button>
          </div>
        </div>
        
        <div className="mb-6 w-full max-w-sm">{renderCalendar()}</div>

        {dailyProgress?.parent_reply && (
          <div className="mb-8 w-full max-w-sm bg-white border-4 border-orange-200 rounded-3xl p-6 shadow-lg relative">
            <div className="absolute -top-4 left-6 bg-orange-400 text-white text-xs font-black tracking-widest px-4 py-1.5 rounded-full shadow-sm">パパ・ママからのお返事</div>
            <p className="text-left text-base font-bold text-stone-700 whitespace-pre-wrap leading-relaxed mt-2">「{dailyProgress.parent_reply}」</p>
          </div>
        )}
        <button onClick={() => { stopSpeaking(); fetchAdminStats(currentUser.id); setAdminTargetUser(currentUser); }} className="mb-8 bg-stone-300 hover:bg-stone-400 text-stone-600 font-bold py-3 px-8 rounded-full w-full max-w-xs shadow-sm text-sm transition">👨‍👩‍👧‍👦 保護者メニューへ</button>
      </div>
    )
  }

  if (view === 'game') {
    const word = questQueue[currentIndex];
    if (isTransitioning) return (<div className={`min-h-screen ${currentUser.light} flex flex-col items-center justify-center pt-8 px-4`}><div className="animate-spin text-5xl mb-4">🌀</div><p className="text-stone-500 font-bold tracking-widest">Next Quest...</p></div>);
    const currentInputMode = (mode === 'weekend') ? inputMode : (selectedInputMode.includes('quiz') ? 'quiz' : 'typing')
    
    return (
      <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-6 px-4 font-sans`}>
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[550px] flex flex-col relative transition-all duration-300 border border-white/50">
           {mode === 'parent_challenge' && <div className="w-full bg-rose-500 text-white text-center py-1.5 text-xs font-black tracking-widest animate-pulse">🔥 パパからの挑戦状 🔥</div>}
           {mode === 'weekend' && (<div className="w-full bg-slate-900 text-white p-5 flex flex-col items-center relative overflow-hidden"><p className="text-xs font-bold text-indigo-300 mb-2 tracking-widest">Weekend Boss Battle - Round {weekendPhase}</p><div className={`text-7xl mb-3 transition-transform duration-100 ${isBossAttacked ? 'scale-90 opacity-50 translate-x-1 translate-y-1' : 'animate-bounce'}`}>{bossHp > (currentGameGoal/2) ? '🐉' : bossHp > 0 ? '🦖' : '💥'}</div><div className="w-full max-w-xs bg-slate-700 rounded-full h-4 border-2 border-slate-500 relative overflow-hidden"><div className="bg-gradient-to-r from-rose-500 to-orange-500 h-full transition-all duration-300" style={{ width: `${(bossHp / currentGameGoal) * 100}%` }}></div></div><p className="font-bold mt-2 text-sm text-slate-300">BOSS HP: {bossHp} / {currentGameGoal}</p>{isBossAttacked && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-black text-rose-500 animate-ping">BANG!</div>}</div>)}
           
          <div className={`${currentUser.color} p-4 flex justify-between items-center text-white shadow-sm`}><span className="font-black tracking-widest text-sm bg-black/20 px-3 py-1 rounded-full">QUEST {currentIndex + 1} / {questQueue.length}</span><button onClick={() => { stopSpeaking(); setView('menu'); }} className="text-xs font-bold opacity-80 hover:opacity-100 bg-white/20 px-3 py-1 rounded-full">にげる</button></div>
          <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
            
            {showRick && (
              <div className="absolute inset-0 bg-stone-900/60 z-10 flex flex-col items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
                <div className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl max-w-xs w-full animate-in zoom-in duration-300 border-4 border-white max-h-[90vh] overflow-y-auto no-scrollbar relative">
                  <img src="/Rick.png" alt="Rick" className="w-24 h-24 rounded-full border-4 border-orange-400 mb-3 shadow-xl object-cover shrink-0" />
                  <p className="text-xl font-black text-orange-600 mb-2 tracking-wide">{message}</p>
                  <div className="mb-2 text-5xl drop-shadow-md">{word.emoji}</div>
                  <div className="mb-4 relative">
                    {word.stroke_count && <span className="absolute -right-6 -top-2 text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{word.stroke_count}画</span>}
                    <p className="text-5xl font-black text-stone-800 mb-1">{word.kanji}</p>
                    <p className="text-lg font-bold text-sky-600 bg-sky-50 px-4 py-1 rounded-full inline-block">{renderReading(word.reading, word.okurigana)}</p>
                  </div>
                  {message.includes('正解') && word.origin_logic && (
                    <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mb-5 text-left shadow-inner shrink-0">
                      <p className="text-xs font-black text-amber-700 mb-1.5 flex items-center gap-1">💡 漢字のひみつ</p>
                      <p className="text-xs text-stone-700 font-bold leading-relaxed">{word.origin_logic}</p>
                    </div>
                  )}
                  <button onClick={nextQuestion} className={`${currentUser.color} text-white font-black py-4 px-10 rounded-full shadow-xl hover:scale-105 transform active:scale-95 transition tracking-widest mt-auto shrink-0`}>次へ進む 🐾</button>
                </div>
              </div>
            )}
            
            {mode !== 'weekend' && ((showHint || mistakeCount >= 1) ? (<div className="w-28 h-28 bg-stone-100 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner animate-in zoom-in border-4 border-white">{word.emoji}</div>) : (<div className="w-28 h-28 bg-stone-50 rounded-full flex items-center justify-center text-5xl mb-6 border-4 border-dashed border-stone-200 text-stone-300">❓</div>))}
            
            <div className="mb-8 text-center w-full flex flex-col items-center">
              {currentInputMode === 'typing' && mistakeCount >= 1 && (showFlashAnswer ? (<div className="animate-bounce"><p className="text-sm text-rose-500 font-bold mb-2">答えを覚えて！</p><p className="text-5xl font-black text-rose-600">{renderReading(word.reading, word.okurigana)}</p></div>) : (<p className="text-lg font-bold text-stone-400 mb-4 animate-pulse bg-stone-100 py-1 px-4 rounded-full inline-block">ひらがなで入力してね</p>))}
              
              {currentInputMode === 'quiz' ? (
                  <div className="w-full flex flex-col items-center">
                      {langMode === 'kanji_to_read' ? (
                          <div className="bg-stone-50 border-2 border-stone-200 rounded-3xl p-8 shadow-inner w-full"><h2 className="text-[5rem] font-black text-stone-800 leading-none">{word.kanji}</h2></div>
                      ) : (
                          <div className="bg-sky-50 border-2 border-sky-200 rounded-3xl p-6 shadow-inner w-full"><h2 className="text-4xl font-black text-sky-800 mb-3">{renderReading(word.reading, word.okurigana)}</h2>{word.sentence && <p className="text-stone-600 font-bold text-lg bg-white py-2 px-4 rounded-xl shadow-sm border border-sky-100">{word.sentence.replace('□', '〇')}</p>}</div>
                      )}
                      
                      {feedbackMsg && (
                          <div className="mt-4 bg-rose-50 border-2 border-rose-200 text-stone-700 py-2 px-5 rounded-xl text-sm animate-in zoom-in slide-in-from-bottom-2 shadow-sm font-bold">
                              {feedbackMsg}
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="bg-stone-50 border-2 border-stone-200 rounded-3xl p-6 shadow-inner mb-6 w-full">
                      <h2 className="text-6xl font-black text-stone-800 mb-3">{word.kanji}</h2>
                      {word.sentence && <p className="text-stone-500 font-bold mb-3">{word.sentence}</p>}
                      <p className="text-sm font-black text-sky-600 bg-sky-100 py-1 px-4 rounded-full inline-block animate-pulse">読みを入力！</p>
                  </div>
              )}
            </div>

            {currentInputMode === 'quiz' ? (
                <div className="grid grid-cols-1 gap-3 w-full">
                    {options.map((opt) => (
                        <button key={opt.id} onClick={() => checkAnswer(langMode === 'kanji_to_read' ? getFullReading(opt.reading, opt.okurigana) : opt.kanji)} className="bg-white hover:bg-orange-50 border-b-4 border-stone-200 hover:border-orange-300 text-stone-700 font-black py-5 px-4 rounded-2xl transition-all text-2xl shadow-sm active:translate-y-1 active:border-b-0">
                            {langMode === 'kanji_to_read' ? renderReading(opt.reading, opt.okurigana) : opt.kanji}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="w-full mt-auto">
                    <input type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkAnswer(userAnswer)} className="w-full border-4 border-sky-200 rounded-2xl p-5 text-center text-3xl font-black focus:outline-none focus:border-sky-500 mb-4 text-stone-800 shadow-inner bg-stone-50" placeholder="ひらがなで..." autoFocus />
                    <button onClick={() => checkAnswer(userAnswer)} className="w-full bg-gradient-to-r from-sky-400 to-indigo-500 text-white font-black py-4 rounded-2xl shadow-lg hover:opacity-90 transition active:scale-95 text-xl tracking-widest">答える！</button>
                </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'result') {
    return (
      <div className={`min-h-screen ${currentUser.light} flex flex-col items-center justify-center p-4 font-sans`}>
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in border-4 border-white/50">
          <div className="text-7xl mb-6 drop-shadow-md">🎊</div>
          <h2 className={`text-3xl font-black ${currentUser.text} mb-6 tracking-widest`}>クエストクリア！</h2>
          {mode === 'daily' && (<div className="bg-orange-50 rounded-2xl p-5 mb-6 border-2 border-orange-200 shadow-inner"><p className="font-bold text-orange-800 mb-2 text-sm bg-white inline-block px-3 py-1 rounded-full shadow-sm">🎁 今日のご褒美</p><p className="text-lg text-stone-800 font-black whitespace-pre-wrap leading-relaxed mt-2">{rewardTip}</p></div>)}
          {mode === 'weekend' && (<div className="bg-indigo-50 rounded-2xl p-5 mb-6 border-2 border-indigo-200 text-left shadow-inner"><p className="font-black text-center text-indigo-700 mb-3 bg-white py-1 rounded-lg shadow-sm">🗝️ Rickの秘密情報</p><ul className="text-sm space-y-2 text-stone-800 font-bold">{weekendTips.map((t, i) => <li key={i} className="flex gap-2"><span className="text-indigo-500">✨</span> {t}</li>)}</ul></div>)}
          {completeBonusTip && (<div className="bg-amber-100 rounded-2xl p-5 mb-6 border-4 border-amber-300 shadow-md animate-bounce"><p className="font-black text-amber-800 mb-2">🌟 全ミッションクリアボーナス！</p><p className="text-sm text-stone-800 font-bold whitespace-pre-wrap leading-relaxed bg-white/50 p-3 rounded-xl mt-2">✨ {completeBonusTip}</p></div>)}
          {mode === 'daily' && !dailyProgress.child_comment && (
            <div className="mb-6 bg-stone-50 p-5 rounded-2xl border-2 border-stone-200">
              <p className="text-sm font-black text-rose-500 mb-3 animate-pulse">👇 日記を書かないと終われないよ！</p>
              <textarea value={childCommentInput} onChange={(e) => setChildCommentInput(e.target.value)} placeholder="今日の一言日記を書こう！（例：難しかった！）" className="w-full border-2 border-stone-300 rounded-xl p-4 text-sm focus:outline-none focus:border-orange-400 font-bold shadow-inner" rows={3} />
              <button onClick={saveChildComment} className="mt-4 w-full bg-gradient-to-r from-orange-400 to-rose-500 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition tracking-widest">日記を送って終了！ 📝</button>
            </div>
          )}
          {(dailyProgress.child_comment || mode !== 'daily') && <button onClick={() => { stopSpeaking(); setView('menu'); }} className={`w-full bg-gradient-to-r ${currentUser.hue} text-white font-black py-4 px-8 rounded-full shadow-xl hover:scale-105 active:scale-95 transition tracking-widest`}>メニューに戻る</button>}
        </div>
      </div>
    )
  }

  if (view === 'collection') {
    const filteredGold = collectionData.gold.filter((w: KanjiWord) => collectionTab === 'general' ? true : w.category === collectionTab); const filteredSilver = collectionData.silver.filter((w: KanjiWord) => collectionTab === 'general' ? true : w.category === collectionTab); const filteredBronze = collectionData.bronze.filter((w: KanjiWord) => collectionTab === 'general' ? true : w.category === collectionTab); const filteredLearning = collectionData.learning.filter((w: KanjiWord) => collectionTab === 'general' ? true : w.category === collectionTab);
    
   const renderWordCard = (w: any, colorClass: string) => {
    const isRevealed = revealedCards.includes(w.id); 
    const showKanji = flashcardMode !== 'hide_kanji' || isRevealed; 
    const showReading = flashcardMode !== 'hide_reading' || isRevealed;
    return (
        <div key={w.id} onClick={() => toggleCardReveal(w.id)} className={`bg-white p-3 rounded-2xl shadow-sm border-b-4 ${colorClass} flex flex-col items-center justify-center cursor-pointer transition active:scale-95 hover:opacity-90 relative min-h-[110px] overflow-hidden`}>
            {w.stroke_count && !isRevealed && <span className="absolute top-1 left-2 text-[10px] font-bold text-stone-400">{w.stroke_count}画</span>}
            {w.is_writing_master && <span className="absolute top-1 right-1 text-xl animate-bounce drop-shadow-md z-20" title="書き取りマスター！">👑</span>}
            
            {isRevealed ? (
                <div className="absolute inset-0 bg-white z-10 flex flex-col items-center p-3 animate-in zoom-in overflow-y-auto no-scrollbar">
                    <span className="text-3xl font-black text-stone-800 shrink-0 mb-1">{w.kanji}</span>
                    <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md mb-2 shrink-0">{renderReading(w.reading, w.okurigana)}</span>

                    {(w.usage_example || w.origin_logic) && (
                        <div className="w-full text-left space-y-2 pb-1">
                            {w.usage_example && (
                                <div className="bg-sky-50 p-2 rounded-lg border border-sky-100">
                                    <p className="text-[10px] font-black text-sky-700 mb-1 flex items-center gap-1"><span>📖</span> 例文</p>
                                    <p className="text-[11px] font-bold text-stone-700 leading-snug">{w.usage_example}</p>
                                </div>
                            )}
                            {w.origin_logic && (
                                <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-700 mb-1 flex items-center gap-1"><span>💡</span> 成り立ち</p>
                                    <p className="text-[11px] font-bold text-stone-700 leading-snug">{w.origin_logic}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <span className="text-2xl mb-1 drop-shadow-sm">{w.emoji}</span>
                    {showKanji ? <span className="text-4xl font-black text-stone-800 my-1">{w.kanji}</span> : <span className="text-4xl font-black text-stone-200 my-1">?</span>}
                    {showReading ? <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md mt-1">{renderReading(w.reading, w.okurigana)}</span> : <span className="text-xs text-stone-200 mt-1 bg-stone-50 px-2 py-0.5 rounded-md">???</span>}
                </>
            )}
        </div>
    )
   }

    return (
      <div className={`min-h-screen ${currentUser.light} p-4 font-sans`}>
         <div className="max-w-2xl mx-auto">
           <button onClick={() => { stopSpeaking(); setView('menu'); }} className="mb-4 font-bold text-stone-500 bg-white px-4 py-2 rounded-full shadow-sm hover:bg-stone-50 transition">← メニューへ</button>
           <h2 className="text-2xl font-black text-emerald-800 mb-4 text-center tracking-widest">📖 {currentUser.name.split(' ')[0]}の漢字図鑑</h2>
           
           <div className="flex overflow-x-auto gap-2 mb-4 pb-2 no-scrollbar">{CATEGORIES.map(cat => ( <button key={cat.id} onClick={() => setCollectionTab(cat.id)} className={`px-4 py-2 rounded-full whitespace-nowrap font-bold text-sm shadow-sm transition ${collectionTab === cat.id ? 'bg-emerald-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}>{cat.name}</button> ))}</div>
           
           <div className="flex justify-center gap-2 mb-4 bg-white p-2 rounded-2xl shadow-sm border border-stone-100"><button onClick={() => setFlashcardMode('normal')} className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition ${flashcardMode === 'normal' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-400 hover:bg-stone-50'}`}>すべて表示</button><button onClick={() => setFlashcardMode('hide_reading')} className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition ${flashcardMode === 'hide_reading' ? 'bg-sky-500 text-white shadow-md' : 'text-stone-400 hover:bg-stone-50'}`}>読みを隠す</button><button onClick={() => setFlashcardMode('hide_kanji')} className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition ${flashcardMode === 'hide_kanji' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-400 hover:bg-stone-50'}`}>漢字を隠す</button></div>
           <p className="text-xs text-center font-bold text-stone-400 mb-6 animate-pulse">※カードをタップすると裏面（成り立ち・例文）が見れるよ！</p>
           
           {filteredGold.length > 0 && (<div className="mb-6"><h3 className="font-black text-amber-700 mb-3 bg-amber-100 p-3 rounded-xl border border-amber-200 shadow-sm flex items-center gap-2"><span className="text-xl">🥇</span> マスター ({filteredGold.length})</h3><div className="grid grid-cols-2 gap-3">{filteredGold.map((w: KanjiWord) => renderWordCard(w, 'border-amber-400'))}</div></div>)}
           {filteredSilver.length > 0 && (<div className="mb-6"><h3 className="font-black text-slate-600 mb-3 bg-slate-200 p-3 rounded-xl border border-slate-300 shadow-sm flex items-center gap-2"><span className="text-xl">🥈</span> シルバー ({filteredSilver.length})</h3><div className="grid grid-cols-2 gap-3">{filteredSilver.map((w: KanjiWord) => renderWordCard(w, 'border-slate-400'))}</div></div>)}
           {filteredBronze.length > 0 && (<div className="mb-6"><h3 className="font-black text-orange-800 mb-3 bg-orange-200 p-3 rounded-xl border border-orange-300 shadow-sm flex items-center gap-2"><span className="text-xl">🥉</span> ブロンズ ({filteredBronze.length})</h3><div className="grid grid-cols-2 gap-3">{filteredBronze.map((w: KanjiWord) => renderWordCard(w, 'border-orange-500'))}</div></div>)}
           <div className="mb-6"><h3 className="font-black text-sky-700 mb-3 bg-sky-100 p-3 rounded-xl border border-sky-200 shadow-sm flex items-center gap-2"><span className="text-xl">🥚</span> 修行中 ({filteredLearning.length})</h3><div className="grid grid-cols-2 gap-3">{filteredLearning.map((w: KanjiWord) => renderWordCard(w, 'border-sky-300'))}</div></div>
         </div>
      </div>
    )
  }

  if (view === 'rick_challenge') {
    const word = questQueue[currentIndex]
    return (
        <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-10 px-4 font-sans`}>
            <h2 className="text-xl font-black text-orange-600 mb-6 bg-white px-6 py-2 rounded-full shadow-sm border-2 border-orange-100">⚡ Rickの挑戦状 ({currentIndex + 1}/{questQueue.length})</h2>
            <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl h-96 flex flex-col items-center justify-center p-8 cursor-pointer active:scale-95 transition-all relative overflow-hidden border-4 border-white/50" onClick={() => setRickStep(prev => prev < 2 ? (prev + 1) as 0|1|2 : prev)}>
                <p className="text-stone-400 font-bold text-xs absolute top-5 bg-stone-50 px-3 py-1 rounded-full">タップしてめくる</p>
                {rickStep === 0 && <p className="text-[6rem] font-black text-stone-800 drop-shadow-sm">{word.kanji}</p>}
                {rickStep === 1 && <div className="text-center animate-in zoom-in"><p className="text-5xl font-black text-stone-300 mb-6">{word.kanji}</p><p className="text-6xl font-black text-sky-600 drop-shadow-sm">{renderReading(word.reading, word.okurigana)}</p></div>}
                {rickStep === 2 && (
                    <div className="text-center animate-in zoom-in w-full overflow-y-auto no-scrollbar max-h-full py-4 relative">
                        {word.stroke_count && <span className="absolute top-0 right-0 text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded-full">{word.stroke_count}画</span>}
                        <div className="text-6xl mb-3 drop-shadow-md">{word.emoji}</div>
                        <p className="text-4xl font-black text-stone-800 mb-2">{word.kanji}</p>
                        <p className="text-xl text-sky-600 font-bold bg-sky-50 py-1 rounded-lg inline-block px-4 mb-3">{renderReading(word.reading, word.okurigana)}</p>
                        {word.usage_example && <div className="bg-sky-50 p-2 rounded-xl border border-sky-100 text-left mb-2"><p className="text-[10px] font-black text-sky-700 mb-1">📖 例文</p><p className="text-xs font-bold text-stone-700">{word.usage_example}</p></div>}
                        {word.origin_logic && <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 text-left"><p className="text-[10px] font-black text-amber-700 mb-1">💡 成り立ち</p><p className="text-xs font-bold text-stone-700">{word.origin_logic}</p></div>}
                        {!word.usage_example && !word.origin_logic && word.sentence && <p className="text-sm font-bold text-stone-500 mt-4 bg-stone-50 py-2 rounded-xl">{word.sentence}</p>}
                    </div>
                )}
            </div>
            {rickStep === 2 && (
                <div className="flex gap-4 w-full max-w-sm mt-8 animate-in slide-in-from-bottom">
                    <button onClick={() => { const updated = [...(dailyProgress.details || []), { time: new Date().toLocaleTimeString('ja-JP'), word: word.kanji, mode: '⚡', result: 'incorrect' } as ActivityLog]; updateProgress(word.id, false, updated).then(nextQuestion); }} className="flex-1 bg-white text-rose-500 font-black py-4 rounded-2xl border-b-4 border-rose-200 active:translate-y-1 active:border-b-0 transition text-lg">❌ まだ...</button>
                    <button onClick={() => { const updated = [...(dailyProgress.details || []), { time: new Date().toLocaleTimeString('ja-JP'), word: word.kanji, mode: '⚡', result: 'correct' } as ActivityLog]; updateProgress(word.id, true, updated).then(nextQuestion); }} className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg hover:opacity-90 active:scale-95 transition text-lg tracking-widest">⭕ 覚えた！</button>
                </div>
            )}
            <button onClick={() => { stopSpeaking(); setView('menu'); }} className="mt-8 text-stone-400 font-bold underline hover:text-stone-600 bg-white/50 px-4 py-2 rounded-full">やめる</button>
        </div>
    )
  }

  return null
}