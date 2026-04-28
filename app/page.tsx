'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import confetti from 'canvas-confetti'
import { USERS, CATEGORIES, MODE_NAMES, getUserFirstName } from '@/lib/constants'
import type { KanjiWord, ActivityLog, DailyLog, ProgressStats, ChallengeSettings } from '@/lib/constants'

import MenuScreen from '@/components/MenuScreen'
import AdminScreen from '@/components/AdminScreen'
import GameScreen from '@/components/GameScreen'
import CollectionScreen from '@/components/CollectionScreen'

// --- ヘルパー関数 ---
const getJSTDate = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
const formatDate = (dateObj: Date) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
const getTodayJST = () => formatDate(getJSTDate());
const getYesterdayJST = () => {
    const d = getJSTDate();
    d.setDate(d.getDate() - 1);
    return formatDate(d);
};
const getJSTTimeString = () => getJSTDate().toLocaleTimeString('ja-JP', { hour12: false });

export default function Home() {
  const [defaultUser] = USERS;
  
  // --- ステート管理 ---
  const [currentUser, setCurrentUser] = useState(defaultUser)
  const [view, setView] = useState<'menu'|'game'|'rick_challenge'|'result'|'admin'|'collection'>('menu')
  const [mode, setMode] = useState<'daily'|'free'|'weekend'|'parent_challenge'|'rick_challenge'|'revenge'>('daily')
  const [loading, setLoading] = useState(false); 
  
  const [targetKyu, setTargetKyu] = useState<string>('all')
  const [selectedInputMode, setSelectedInputMode] = useState<'quiz_kanji'|'typing_read'|'write_canvas'|'write_self'>('quiz_kanji')
  const [rickMode, setRickMode] = useState<'read'|'think'|'write'>('read')
  const [reviewRevealed, setReviewRevealed] = useState<number[]>([])
  
  const [adminTargetUser, setAdminTargetUser] = useState(defaultUser)
  const [allWordsList, setAllWordsList] = useState<any[]>([]); 
  const [selectedLogDate, setSelectedLogDate] = useState<string|null>(null); 
  const [editStreak, setEditStreak] = useState(0)
  
  const [challengeSettings, setChallengeSettings] = useState<any>({ mode: 'auto', selected_ids: [], auto_count: 5, quest_count: 5, special_quest_count: 10, challenge_quest_count: 8, reward_goal_days: 14, reward_text: '好きなおやつ', owned_rewards: 0, total_earned_rewards: 0, unlocked_tips: [] })
  const [hasParentChallenge, setHasParentChallenge] = useState(false); 
  const [calendarDate, setCalendarDate] = useState<Date>(getJSTDate())
  
  const [dailyProgress, setDailyProgress] = useState<any>({ id: 0, date: getTodayJST(), count: 0, is_completed: false, study_time_seconds: 0, collection_views: 0 })
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]); 
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [reviewCandidates, setReviewCandidates] = useState<KanjiWord[]>([])
  
  const [currentGameGoal, setCurrentGameGoal] = useState(5); 
  const [questQueue, setQuestQueue] = useState<KanjiWord[]>([]); 
  const [currentIndex, setCurrentIndex] = useState(0)
  const [weekendPhase, setWeekendPhase] = useState<1|2|3>(1); 
  const [gameStep, setGameStep] = useState<0|1>(0)
  const [bossHp, setBossHp] = useState(10); 
  const [isBossAttacked, setIsBossAttacked] = useState(false); 
  const [userAnswer, setUserAnswer] = useState('')
  const [message, setMessage] = useState(''); 
  const [showRick, setShowRick] = useState(false); 
  const [mistakeCount, setMistakeCount] = useState(0); 
  const [feedbackMsg, setFeedbackMsg] = useState<React.ReactNode | null>(null)
  const [showHint, setShowHint] = useState(false); 
  const [showFlashAnswer, setShowFlashAnswer] = useState(false); 
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false); 
  const [langMode, setLangMode] = useState<'kanji_to_read'|'read_to_kanji'>('read_to_kanji')
  const [inputMode, setInputMode] = useState<'quiz'|'typing'|'canvas'|'self'>('quiz'); 
  const [options, setOptions] = useState<KanjiWord[]>([])
  const [isListening, setIsListening] = useState(false)

  const [rewardTipsList, setRewardTipsList] = useState<string[]>([]);
  const [openedChests, setOpenedChests] = useState<number[]>([]);
  const [specialRewardMsg, setSpecialRewardMsg] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const pendingTimeRef = useRef(0);
  const pendingViewsRef = useRef(0);

  // --- 学習タイマー & 図鑑カウント ---
  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (view === 'game' || view === 'collection' || view === 'rick_challenge') {
          interval = setInterval(() => { pendingTimeRef.current += 1; }, 1000);
      }
      return () => clearInterval(interval);
  }, [view]);

  const handleViewCollectionCard = () => { pendingViewsRef.current += 1; }

  const savePendingData = async () => {
      if (pendingTimeRef.current === 0 && pendingViewsRef.current === 0) return;
      const today = getTodayJST();
      const { data: currentLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).single();
      if (currentLog) {
          const newTime = (currentLog.study_time_seconds || 0) + pendingTimeRef.current;
          const newViews = (currentLog.collection_views || 0) + pendingViewsRef.current;
          await supabase.from('daily_logs').update({ study_time_seconds: newTime, collection_views: newViews }).eq('id', currentLog.id);
          setDailyProgress((prev: any) => ({ ...prev, study_time_seconds: newTime, collection_views: newViews }));
          pendingTimeRef.current = 0; pendingViewsRef.current = 0;
      }
  }

  // --- UIヘルパー ---
  const renderReading = (reading: string, okurigana?: string | null) => {
      if (!okurigana) return <span>{reading}</span>;
      return (<span className="inline-flex items-baseline"><span>{reading}</span><span className="text-[0.75em] font-bold ml-[1px] opacity-60">{okurigana}</span></span>);
  };
  const getFullReading = (reading: string, okurigana?: string | null) => okurigana ? `${reading}${okurigana}` : reading;
  const formatReading = (reading: string, okurigana?: string | null) => okurigana ? `${reading}・${okurigana}` : reading;

  // --- 通信ロジック ---
  const checkDailyProgress = async () => {
    const today = getTodayJST(); const yesterdayStr = getYesterdayJST();
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).single()
    if (data) {
        if (!data.is_completed) {
            const { data: yLog } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', yesterdayStr).single();
            setDailyProgress({ ...data, streak: (yLog?.is_completed) ? (yLog.streak || 0) : 0 });
        } else setDailyProgress(data);
    } else {
        const { data: yLog } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', yesterdayStr).single();
        setDailyProgress({ id: 0, date: today, count: 0, is_completed: false, details: [], streak: (yLog?.is_completed) ? (yLog.streak || 0) : 0, study_time_seconds: 0, collection_views: 0 })
    }
  }

  const checkChallengeStatus = async () => {
    const { data } = await supabase.from('challenge_settings').select('*').eq('target_user_id', currentUser.id).single()
    if (data) {
        setHasParentChallenge((data.mode === 'manual' ? (data.selected_ids?.length > 0) : (data.auto_count > 0)))
        setChallengeSettings((prev: any) => ({ ...prev, ...data }));
    } else setHasParentChallenge(false)
  }

  const fetchMonthlyLogs = async (targetDate: Date = calendarDate) => {
    const year = targetDate.getFullYear(); const month = targetDate.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).gte('date', firstDay).lte('date', lastDay)
    if (data) setMonthlyLogs(data)
  }

  const fetchReviewCandidates = async () => {
    const { data: allWords } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target);
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

  // --- 管理者機能（ここが不足していました） ---
  const fetchAllWordsForEdit = async () => {
    const { data: words } = await supabase.from('kanji_questions').select('*').eq('target_user', adminTargetUser.db_target).order('id', { ascending: false });
    const { data: progress } = await supabase.from('user_progress').select('question_id, status').eq('user_id', adminTargetUser.id);
    if (words) {
        const statusMap = new Map<number, string>(); progress?.forEach((p: any) => statusMap.set(p.question_id, p.status));
        setAllWordsList(words.map((w: any) => ({ ...w, currentStatus: statusMap.get(w.id) || 'learning' })));
    }
  }

  const fetchAdminStats = async (targetUser: any = adminTargetUser) => {
      setLoading(true)
      const { count: total } = await supabase.from('kanji_questions').select('*', { count: 'exact', head: true }).eq('target_user', targetUser.db_target)
      const { data: progress } = await supabase.from('user_progress').select('status, mistake_count, is_writing_master, question_id, kanji_questions(kanji, reading, okurigana)').eq('user_id', targetUser.id)
      const ranks = { learning: 0, bronze: 0, silver: 0, gold: 0 }; let weakWordsList: any[] = []; 
      progress?.forEach((p: any) => {
          const wordData = p.kanji_questions;
          if (p.status === 'mastered' || p.status === 'gold') ranks.gold++; else if (p.status === 'silver') ranks.silver++; else if (p.status === 'bronze') ranks.bronze++; else ranks.learning++;
          if (p.mistake_count > 0 && wordData) weakWordsList.push({ word: wordData.kanji, meaning: getFullReading(wordData.reading, wordData.okurigana), mistakes: p.mistake_count });
      });
      ranks.learning = Math.max(0, (total || 0) - ranks.gold - ranks.silver - ranks.bronze); 
      weakWordsList.sort((a, b) => b.mistakes - a.mistakes);
      const thirtyDaysAgo = getJSTDate(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: logData } = await supabase.from('daily_logs').select('*').eq('user_id', targetUser.id).gte('date', formatDate(thirtyDaysAgo)).order('date', { ascending: true })
      const graphData = logData?.map(l => ({ date: l.date.slice(5).replace('-', '/'), count: l.count || 0 })) || []
      const pieData = [ { name: `未習得 (${ranks.learning})`, value: ranks.learning }, { name: `ブロンズ (${ranks.bronze})`, value: ranks.bronze }, { name: `シルバー (${ranks.silver})`, value: ranks.silver }, { name: `ゴールド (${ranks.gold})`, value: ranks.gold } ]
      const reversedLogs = logData ? [...logData].reverse() : []; const [latestLog] = reversedLogs; setEditStreak(latestLog ? (latestLog.streak || 0) : 0);
      setStats({ total: total || 0, mastered: ranks.gold, ranks, weakWords: weakWordsList, checkWords: [], recentLogs: reversedLogs, graphData, pieData })
      const { data: challenge } = await supabase.from('challenge_settings').select('*').eq('target_user_id', targetUser.id).single()
      if (challenge) setChallengeSettings(challenge);
      setLoading(false); setView('admin')
  }

  const handleSaveStreak = async () => {
      const today = getTodayJST();
      const { data: cur } = await supabase.from('daily_logs').select('*').eq('user_id', adminTargetUser.id).eq('date', today).limit(1).single();
      if (cur) await supabase.from('daily_logs').update({ streak: editStreak }).eq('id', cur.id);
      else await supabase.from('daily_logs').insert([{ user_id: adminTargetUser.id, date: today, count: 0, is_completed: false, streak: editStreak }]);
      alert('連続日数を修正しました'); fetchAdminStats(adminTargetUser);
  }

  const handleAddWord = async (newWordData: any) => {
      const payload = { ...newWordData, kanji_level: newWordData.category, target_user: adminTargetUser.db_target };
      await supabase.from('kanji_questions').insert([payload]);
      alert('追加しました'); fetchAllWordsForEdit();
  }

  const toggleMasterStatus = async (id: number, currentStatus: string) => {
      if (currentStatus === 'gold') await supabase.from('user_progress').delete().eq('user_id', adminTargetUser.id).eq('question_id', id);
      else await supabase.from('user_progress').upsert({ user_id: adminTargetUser.id, question_id: id, status: 'gold', last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id, question_id' });
      fetchAllWordsForEdit(); fetchAdminStats(adminTargetUser);
  }

  const handleDeleteWord = async (id: number) => {
      if (!confirm('削除しますか？')) return;
      await supabase.from('kanji_questions').delete().eq('id', id);
      fetchAllWordsForEdit();
  }

  const saveChallengeSettings = async (settings: any) => {
      setChallengeSettings(settings);
      await supabase.from('challenge_settings').upsert({
          target_user_id: adminTargetUser.id, mode: settings.mode, selected_ids: settings.selected_ids, 
          auto_count: settings.auto_count, quest_count: settings.quest_count, special_quest_count: settings.special_quest_count, challenge_quest_count: settings.challenge_quest_count, 
          reward_goal_days: settings.reward_goal_days, reward_text: settings.reward_text,
          owned_rewards: settings.owned_rewards, total_earned_rewards: settings.total_earned_rewards,
          unlocked_tips: settings.unlocked_tips, updated_at: new Date().toISOString()
      }, { onConflict: 'target_user_id' });
      alert('保存しました');
  }

  const sendLineToChild = async (msg: string) => {
      await fetch('/api/line/send', { method: 'POST', body: JSON.stringify({ message: msg }) });
      alert('送信しました');
  }

  // --- ゲーム進行 ---
  const startGame = async (selectedMode: any) => {
      setLoading(true); setMode(selectedMode); setOpenedChests([]); setRewardTipsList([]); setSpecialRewardMsg(''); setMistakeCount(0);
      let QUEST_LIMIT = challengeSettings.quest_count || 5; 
      if (selectedMode === 'weekend') QUEST_LIMIT = challengeSettings.special_quest_count || 10; 
      else if (selectedMode === 'parent_challenge' || selectedMode === 'rick_challenge') QUEST_LIMIT = challengeSettings.challenge_quest_count || 8; 
      setCurrentGameGoal(QUEST_LIMIT);
      if (selectedMode === 'weekend') { setWeekendPhase(1); setBossHp(QUEST_LIMIT); } 
      const { data: allWords } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target)
      if (!allWords?.length) return setLoading(false);
      let queue = [...allWords].sort(() => 0.5 - Math.random()).slice(0, (selectedMode === 'daily' || selectedMode === 'weekend') ? QUEST_LIMIT : 20);
      setQuestQueue(queue); setCurrentIndex(0); 
      const [first] = queue; if(first) prepareQuestion(first, allWords);
      setView('game'); setLoading(false)
  }

  const prepareQuestion = (word: KanjiWord, allWords: KanjiWord[]) => {
      setUserAnswer(''); setMessage(''); setShowRick(false); setMistakeCount(0); clearCanvas();
      const nextLangMode = (selectedInputMode === 'typing_read') ? 'kanji_to_read' : 'read_to_kanji';
      setLangMode(nextLangMode);
      if (nextLangMode === 'read_to_kanji') speakWord(getFullReading(word.reading, word.okurigana));
      const others = allWords.filter(w => w.id !== word.id).sort(() => 0.5 - Math.random()).slice(0, 3)
      setOptions([word, ...others].sort(() => 0.5 - Math.random()))
  }

  const checkAnswer = async (ans: string) => {
      if (isProcessing || showRick) return;
      setIsProcessing(true);
      const [cur] = questQueue.slice(currentIndex, currentIndex + 1);
      const cor = langMode === 'read_to_kanji' ? cur.kanji : getFullReading(cur.reading, cur.okurigana);
      if (ans === cor) {
          playSound('correct'); setShowRick(true); confetti({ particleCount: 50 });
          if (mode === 'weekend') setBossHp(prev => Math.max(0, prev - 1));
          await updateProgress(cur.id, true);
      } else {
          playSound('wrong'); setMistakeCount(prev => prev + 1); setIsProcessing(false);
          await updateProgress(cur.id, false);
      }
  }

  const updateProgress = async (id: number, correct: boolean) => {
      const today = getTodayJST();
      const { data: currentLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).single();
      const [curWord] = questQueue.slice(currentIndex, currentIndex + 1);
      const newEntry = { time: getJSTTimeString(), word: curWord?.kanji, mode: MODE_NAMES[mode], result: correct ? 'correct' : 'incorrect' };
      const updatedDetails = [...(currentLog?.details || []), newEntry];
      const newCount = correct ? (currentLog?.count || 0) + 1 : (currentLog?.count || 0);
      const comp = newCount >= currentGameGoal;
      const additionalTime = pendingTimeRef.current; pendingTimeRef.current = 0;
      const newTime = (currentLog?.study_time_seconds || 0) + additionalTime;
      const logData = { count: newCount, is_completed: comp, details: updatedDetails, study_time_seconds: newTime };
      if (currentLog) await supabase.from('daily_logs').update(logData).eq('id', currentLog.id);
      else await supabase.from('daily_logs').insert([{ user_id: currentUser.id, date: today, ...logData }]);
      setDailyProgress((prev: any) => ({ ...prev, ...logData })); 
      const { data: pData } = await supabase.from('user_progress').select('status').eq('user_id', currentUser.id).eq('question_id', id).single();
      let ns = pData?.status || 'learning'; if (correct) { if (ns === 'learning') ns = 'bronze'; else if (ns === 'bronze') ns = 'silver'; else if (ns === 'silver') ns = 'gold'; }
      await supabase.from('user_progress').upsert({ user_id: currentUser.id, question_id: id, status: ns, last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id, question_id' });
  }

  const nextQuestion = async () => {
      setIsTransitioning(true); stopSpeaking(); 
      setTimeout(async () => {
          const next = currentIndex + 1
          if (next >= questQueue.length) {
              playSound('clear'); await savePendingData();
              let currentStreak = dailyProgress.streak || 0;
              if (mode === 'daily') {
                  const { data: yLog } = await supabase.from('daily_logs').select('streak').eq('user_id', currentUser.id).eq('date', getYesterdayJST()).single();
                  currentStreak = (yLog?.streak || 0) + 1;
                  await supabase.from('daily_logs').update({ is_completed: true, streak: currentStreak }).eq('user_id', currentUser.id).eq('date', getTodayJST());
                  setDailyProgress((prev: any) => ({ ...prev, is_completed: true, streak: currentStreak }));
                  const goalDays = challengeSettings.reward_goal_days || 14;
                  if (currentStreak > 0 && (currentStreak % goalDays === 0)) {
                      const newOwned = (challengeSettings.owned_rewards || 0) + 1;
                      const newTotal = (challengeSettings.total_earned_rewards || 0) + 1;
                      await supabase.from('challenge_settings').update({ owned_rewards: newOwned, total_earned_rewards: newTotal }).eq('target_user_id', currentUser.id);
                      setChallengeSettings((prev: any) => ({ ...prev, owned_rewards: newOwned, total_earned_rewards: newTotal }));
                      setSpecialRewardMsg(`🎊 ${currentStreak}日達成！ご褒美GET！`);
                  }
              }
              const totalSec = dailyProgress.study_time_seconds || 0;
              let chestCount = totalSec >= 600 ? 1 : 0;
              const { data: tips } = await supabase.from(currentUser.defaultTipTable).select('content');
              setRewardTipsList(tips?.map((t: any) => t.content).sort(() => 0.5 - Math.random()).slice(0, chestCount) || []);
              setView('result');
          } else {
              setCurrentIndex(next);
              const [word] = questQueue.slice(next, next + 1);
              const { data: all } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target);
              if (word && all) prepareQuestion(word, all);
          }
          setIsTransitioning(false);
      }, 500);
  }

  // --- ライフサイクル ---
  useEffect(() => { 
      checkDailyProgress(); fetchMonthlyLogs(calendarDate); fetchReviewCandidates(); checkChallengeStatus(); 
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, view, calendarDate]);

  // --- メインレンダリング ---
  if (view === 'menu') return <MenuScreen {...{currentUser, setCurrentUser, dailyProgress, challengeSettings, targetKyu, setTargetKyu, selectedInputMode, setSelectedInputMode, rickMode, setRickMode, reviewCandidates, reviewRevealed, toggleReviewReveal, hasParentChallenge, startGame, setView, fetchCollection, renderCalendar, stopSpeaking, fetchAdminStats, setAdminTargetUser, renderReading}} />;
  if (view === 'admin') return <AdminScreen {...{currentUser, setView, adminTargetUser, setAdminTargetUser, fetchAdminStats, fetchAllWordsForEdit, stats, challengeSettings, setChallengeSettings, saveChallengeSettings, sendLineToChild, editStreak, setEditStreak, handleSaveStreak, handleAddWord, allWordsList, toggleMasterStatus, handleDeleteWord, monthlyLogs, selectedLogDate, setSelectedLogDate, renderCalendar}} />;
  if (view === 'collection') return <CollectionScreen {...{currentUser, setView, allWordsList, speakWord, renderReading, getFullReading, stopSpeaking, onViewCard: handleViewCollectionCard}} />;
  if (view === 'game') return <GameScreen {...{currentUser, view, mode, questQueue, currentIndex, isTransitioning, selectedInputMode, rickMode, inputMode, langMode, gameStep, setGameStep: () => {}, weekendPhase, bossHp, currentGameGoal, isBossAttacked, showRick, message, showHint, showFlashAnswer, mistakeCount, feedbackMsg: null, options, userAnswer, setUserAnswer, isListening, isDrawing, canvasRef, startDrawing, draw, stopDrawing, clearCanvas, startListening, checkAnswer, handleSelfJudge: () => {}, nextQuestion, stopSpeaking, setView, renderReading, speakWord, getFullReading}} />;

  if (view === 'result') {
    return (
      <div className={`min-h-screen ${currentUser.light} flex flex-col items-center justify-center p-6`}>
        <div className="bg-white p-8 rounded-[3rem] shadow-xl text-center max-w-sm w-full">
          <h2 className="text-3xl font-black text-emerald-500 mb-4">冒険クリア！🐾</h2>
          <img src="/Rick.png" alt="Rick" className="w-32 h-32 mx-auto rounded-full mb-6" />
          <div className="bg-stone-50 p-4 rounded-2xl mb-6 text-left border-2 border-stone-100">
            <p className="text-xs font-black text-orange-600 mb-2">🎁 Rickからのメッセージ</p>
            <p className="text-sm font-bold text-stone-700 whitespace-pre-wrap">{specialRewardMsg || rewardTipsList || "よくがんばったワン！"}</p>
          </div>
          <button onClick={() => setView('menu')} className="w-full bg-stone-800 text-white font-black py-4 rounded-2xl shadow-lg">村へもどる</button>
        </div>
      </div>
    );
  }
  return null;
}