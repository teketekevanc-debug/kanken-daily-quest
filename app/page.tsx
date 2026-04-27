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
          pendingTimeRef.current = 0;
          pendingViewsRef.current = 0;
      }
  }

  const renderReading = (reading: string, okurigana?: string | null) => {
      if (!okurigana) return <span>{reading}</span>;
      return (<span className="inline-flex items-baseline"><span>{reading}</span><span className="text-[0.75em] font-bold ml-[1px] opacity-60">{okurigana}</span></span>);
  };
  const getFullReading = (reading: string, okurigana?: string | null) => okurigana ? `${reading}${okurigana}` : reading;
  const formatReading = (reading: string, okurigana?: string | null) => okurigana ? `${reading}・${okurigana}` : reading;

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => { setIsDrawing(true); const { offsetX, offsetY } = e.nativeEvent; const ctx = canvasRef.current?.getContext('2d'); if (ctx) { ctx.beginPath(); ctx.moveTo(offsetX, offsetY); } (e.target as HTMLElement).setPointerCapture(e.pointerId); };
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!isDrawing) return; const { offsetX, offsetY } = e.nativeEvent; const ctx = canvasRef.current?.getContext('2d'); if (ctx) { ctx.lineTo(offsetX, offsetY); ctx.stroke(); } };
  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => { setIsDrawing(false); const ctx = canvasRef.current?.getContext('2d'); if (ctx) ctx.closePath(); (e.target as HTMLElement).releasePointerCapture(e.pointerId); };
  const clearCanvas = () => { const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); };

  const playSound = (type: 'correct'|'wrong'|'clear'|'chest') => { const audio = new Audio(`/sounds/${type === 'chest' ? 'clear' : type}.mp3`); audio.volume = 0.5; audio.play().catch(e=>console.log(e)); }
  const stopSpeaking = () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); };
  const speakWord = (text: string) => { stopSpeaking(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP'; speechSynthesis.speak(u); }
  const toggleReviewReveal = (id: number) => { if (reviewRevealed.includes(id)) setReviewRevealed(reviewRevealed.filter(rid => rid !== id)); else setReviewRevealed([...reviewRevealed, id]) };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("お使いのブラウザはマイク入力に対応していません🐶💦"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP'; recognition.interimResults = true; recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => { 
      let finalTranscript = ''; let interimTranscript = '';
      const resultsArr = Array.from(event.results);
      resultsArr.forEach((res: any) => {
        const altArray = Array.from(res); const [alt] = altArray;
        if (res.isFinal) finalTranscript += alt.transcript; else interimTranscript += alt.transcript;
      });
      if (interimTranscript) setUserAnswer(interimTranscript);
      if (finalTranscript) { setUserAnswer(finalTranscript); checkAnswer(finalTranscript, true); }
    };
    recognition.onerror = (event: any) => { setIsListening(false); };
    recognition.start();
  }

  const sendLineToChild = async (msg: string) => {
      if (!confirm('LINE通知を送りますか？')) return;
      try { 
          const res = await fetch('/api/line/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
          if (!res.ok) alert("LINE通知の送信に失敗しました🐶💦"); else alert('送信しました！'); 
      } catch(e) { alert('送信失敗（通信エラー）: ' + e); }
  }

  // --- データ取得ロジック ---
  const checkDailyProgress = async () => {
    const today = getTodayJST();
    const yesterdayStr = getYesterdayJST();
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
        setChallengeSettings(prev => ({ ...prev, ...data }));
    } else setHasParentChallenge(false)
  }

  const fetchMonthlyLogs = async (targetDate: Date = calendarDate) => {
    const year = targetDate.getFullYear(); const month = targetDate.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).gte('date', firstDay).lte('date', lastDay)
    if (data) setMonthlyLogs(data)
  }

  // ★ 抜け落ちていた関数：復習候補の取得
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

  const fetchCollection = async () => {
    setLoading(true); setRevealedCards([]);
    await fetchAllWordsForEdit();
    setLoading(false); setView('collection')
  }

  const fetchAllWordsForEdit = async () => {
    setLoading(true);
    const { data: words } = await supabase.from('kanji_questions').select('*').eq('target_user', adminTargetUser.db_target).order('id', { ascending: false });
    const { data: progress } = await supabase.from('user_progress').select('question_id, status').eq('user_id', adminTargetUser.id);
    if (words) {
        const statusMap = new Map<number, string>(); progress?.forEach((p: any) => statusMap.set(p.question_id, p.status));
        setAllWordsList(words.map((w: any) => ({ ...w, currentStatus: statusMap.get(w.id) || 'learning' })));
    }
    setLoading(false);
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
      
      const graphData = logData?.map(l => {
          let totalCorrect = l.count || 0;
          if (l.details && Array.isArray(l.details)) totalCorrect = l.details.filter((d: any) => d.result === 'correct' || d.result === 'done').length;
          return { date: l.date.slice(5).replace('-', '/'), count: totalCorrect };
      }) || []
      
      const pieData = [ { name: `未習得 (${ranks.learning})`, value: ranks.learning }, { name: `ブロンズ (${ranks.bronze})`, value: ranks.bronze }, { name: `シルバー (${ranks.silver})`, value: ranks.silver }, { name: `ゴールド (${ranks.gold})`, value: ranks.gold } ]
      
      const reversedLogs = logData ? [...logData].reverse() : []; const [latestLog] = reversedLogs; setEditStreak(latestLog ? (latestLog.streak || 0) : 0);
      setStats({ total: total || 0, mastered: ranks.gold, ranks, weakWords: weakWordsList, checkWords: [], recentLogs: reversedLogs, graphData, pieData })
      
      const { data: challenge } = await supabase.from('challenge_settings').select('*').eq('target_user_id', targetUser.id).single()
      if (challenge) setChallengeSettings(challenge);
      setLoading(false); setView('admin')
  }

  const saveChallengeSettings = async (settings: any) => {
      setChallengeSettings(settings);
      const { error } = await supabase.from('challenge_settings').upsert({
          target_user_id: adminTargetUser.id, mode: settings.mode, selected_ids: settings.selected_ids, 
          auto_count: settings.auto_count, quest_count: settings.quest_count, special_quest_count: settings.special_quest_count, challenge_quest_count: settings.challenge_quest_count, 
          reward_goal_days: settings.reward_goal_days, reward_text: settings.reward_text,
          owned_rewards: settings.owned_rewards, total_earned_rewards: settings.total_earned_rewards,
          unlocked_tips: settings.unlocked_tips,
          updated_at: new Date().toISOString()
      }, { onConflict: 'target_user_id' });
      if (error) alert(`エラーが発生しました: ${error.message}`); else alert('すべての設定を保存しました！🔥');
  }

  const handleSaveStreak = async () => {
      const today = getTodayJST();
      const { data: cur } = await supabase.from('daily_logs').select('*').eq('user_id', adminTargetUser.id).eq('date', today).limit(1).single();
      if (cur) await supabase.from('daily_logs').update({ streak: editStreak }).eq('id', cur.id);
      else await supabase.from('daily_logs').insert([{ user_id: adminTargetUser.id, date: today, count: 0, is_completed: false, streak: editStreak }]);
      alert(`${getUserFirstName(adminTargetUser.name)}の連続日数を ${editStreak}日 に修正しました！`);
      if (adminTargetUser.id === currentUser.id) setDailyProgress((prev: any) => ({...prev, streak: editStreak}));
      fetchAdminStats(adminTargetUser);
  }

  const handleAddWord = async (newWordData: any) => {
      if (!newWordData.kanji || !newWordData.reading) return alert("漢字と読みは必須だワン！");
      setLoading(true);
      const payload = { ...newWordData, kanji_level: newWordData.category, target_user: adminTargetUser.db_target, stroke_count: newWordData.stroke_count ? parseInt(newWordData.stroke_count) : null, usage_example: newWordData.usage_example || null, origin_logic: newWordData.origin_logic || null };
      const { error } = await supabase.from('kanji_questions').insert([payload]);
      setLoading(false);
      if (error) alert(`エラーが発生しました: ${error.message}`); else { alert(`${getUserFirstName(adminTargetUser.name)}用の新しい言葉を追加したワン！`); fetchAllWordsForEdit(); }
  }

  const toggleMasterStatus = async (id: number, currentStatus: string) => {
      if (currentStatus === 'gold') await supabase.from('user_progress').delete().eq('user_id', adminTargetUser.id).eq('question_id', id);
      else {
          const { error } = await supabase.from('user_progress').upsert({ user_id: adminTargetUser.id, question_id: id, status: 'gold', mistake_count: 0, last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id, question_id' });
          if (error) { alert(`エラー: ${error.message}`); return; }
      }
      fetchAllWordsForEdit(); fetchAdminStats(adminTargetUser); 
  }

  const handleDeleteWord = async (id: number) => {
      if (!confirm('本当にこの言葉を削除しますか？')) return;
      const { error } = await supabase.from('kanji_questions').delete().eq('id', id);
      if (error) alert(`エラー: ${error.message}`); else fetchAllWordsForEdit(); 
  }

  useEffect(() => { 
      checkDailyProgress(); 
      fetchMonthlyLogs(calendarDate); 
      fetchReviewCandidates(); 
      checkChallengeStatus(); 
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, view, calendarDate]);

  const startGame = async (selectedMode: 'daily' | 'free' | 'weekend' | 'parent_challenge' | 'rick_challenge' | 'revenge') => {
      const today = getTodayJST();
      if (dailyProgress.date !== today) setDailyProgress({ id: 0, date: today, count: 0, is_completed: false, details: [], study_time_seconds: 0, collection_views: 0 });
      setLoading(true); setMode(selectedMode); setOpenedChests([]); setRewardTipsList([]); setSpecialRewardMsg(''); setMistakeCount(0); setMessage(''); setShowRick(false); setIsProcessing(false); setIsTransitioning(false); setFeedbackMsg(null);
      stopSpeaking(); 
  
      let QUEST_LIMIT = challengeSettings.quest_count || 5; 
      if (selectedMode === 'weekend') QUEST_LIMIT = challengeSettings.special_quest_count || 10; 
      else if (selectedMode === 'parent_challenge' || selectedMode === 'rick_challenge') QUEST_LIMIT = challengeSettings.challenge_quest_count || 8; 
      else if (selectedMode === 'free') QUEST_LIMIT = 9999; 
      setCurrentGameGoal(QUEST_LIMIT);
  
      if (selectedMode === 'weekend') { setWeekendPhase(1); setBossHp(QUEST_LIMIT); } 
      
      const { data: allWords } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target)
      if (!allWords || !allWords.length) { alert('データがありません！'); setLoading(false); return; }
      
      let availableWords = targetKyu !== 'all' ? allWords.filter(w => w.kanji_level === targetKyu || w.category === targetKyu) : allWords;
      if (availableWords.length === 0) availableWords = allWords;
  
      let queue: KanjiWord[] = [...availableWords].sort(() => 0.5 - Math.random()).slice(0, selectedMode === 'weekend' ? QUEST_LIMIT : undefined);
      if (selectedMode === 'daily') queue = queue.slice(0, QUEST_LIMIT);
  
      setQuestQueue(queue); setCurrentIndex(0); 
      const [firstItemInQueue] = queue;
      if(firstItemInQueue) prepareQuestion(firstItemInQueue, allWords, selectedMode === 'weekend' ? 'weekend' : selectedMode, 1);
      setView(selectedMode === 'rick_challenge' ? 'rick_challenge' : 'game'); 
      setLoading(false)
  }

  const prepareQuestion = (word: KanjiWord, allWords: KanjiWord[], modeOverride?: string, phaseOverride?: number) => {
      setUserAnswer(''); setMessage(''); setShowRick(false); setMistakeCount(0); setShowHint(false); setShowFlashAnswer(false); setIsProcessing(false); setIsTransitioning(false); setFeedbackMsg(null);
      const cMode = modeOverride || mode; const cPhase = phaseOverride || weekendPhase
      let nextLangMode: 'kanji_to_read' | 'read_to_kanji' = 'kanji_to_read';
      
      setGameStep(0); clearCanvas();
  
      if (cMode === 'weekend') {
          if (cPhase === 1) { nextLangMode = 'kanji_to_read'; setInputMode('quiz') } 
          else if (cPhase === 2) { nextLangMode = 'read_to_kanji'; setInputMode('quiz') } 
          else if (cPhase === 3) { nextLangMode = 'kanji_to_read'; setInputMode('typing') } 
      } else { 
          if (selectedInputMode === 'typing_read') { nextLangMode = 'kanji_to_read'; setInputMode('typing') } 
          else if (selectedInputMode === 'quiz_kanji') { nextLangMode = 'read_to_kanji'; setInputMode('quiz') }
          else if (selectedInputMode === 'write_canvas') { nextLangMode = 'read_to_kanji'; setInputMode('canvas') }
          else if (selectedInputMode === 'write_self') { nextLangMode = 'read_to_kanji'; setInputMode('self') }
      }
      setLangMode(nextLangMode);
      if (nextLangMode === 'read_to_kanji') speakWord(getFullReading(word.reading, word.okurigana));
  
      const others = allWords.filter(w => w.id !== word.id).sort(() => 0.5 - Math.random()).slice(0, 3)
      setOptions([word, ...others].sort(() => 0.5 - Math.random()))
  }

  const handleSelfJudge = async (isCorrect: boolean) => {
      if (isProcessing) return;
      setIsProcessing(true);
      const [cur] = questQueue.slice(currentIndex, currentIndex + 1);
      if (isCorrect) { playSound('correct'); confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } else { playSound('wrong'); }
      await updateProgress(cur.id, isCorrect);
      setTimeout(() => { setIsProcessing(false); nextQuestion(); }, 500);
  }

  const checkAnswer = async (ans: string, isVoice: boolean = false) => {
      if (isProcessing || showRick) return;
      setIsProcessing(true);
      const [cur] = questQueue.slice(currentIndex, currentIndex + 1);
      let cor = langMode === 'read_to_kanji' ? cur.kanji : (inputMode === 'typing' ? getFullReading(cur.reading, cur.okurigana) : formatReading(cur.reading, cur.okurigana));
      let isCorrect = (inputMode === 'typing') ? (ans === cor || (isVoice && (ans === cur.kanji || ans === `${cur.kanji}${cur.okurigana}`))) : (ans === cor);
  
      if (isCorrect) {
          playSound('correct'); setMessage('正解！すごい！🎉'); setFeedbackMsg(null);
          const fullReading = getFullReading(cur.reading, cur.okurigana);
          speakWord(cur.origin_logic ? `${fullReading}。${cur.origin_logic}` : fullReading);
          setShowRick(true); confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } }); setShowHint(true); 
          if (mode === 'weekend') { setBossHp(prev => Math.max(0, prev - 1)); setIsBossAttacked(true); setTimeout(() => setIsBossAttacked(false), 500); }
          await updateProgress(cur.id, true)
      } else {
          playSound('wrong'); const nextMistakeCount = mistakeCount + 1; setMistakeCount(nextMistakeCount); setShowHint(true); setIsProcessing(false);
          await updateProgress(cur.id, false);
          if (nextMistakeCount >= 3) { setMessage(`残念... 正解は「${cor}」`); setShowRick(true) } 
          else { if (nextMistakeCount === 2 && inputMode === 'typing') { setShowFlashAnswer(true); setTimeout(() => setShowFlashAnswer(false), 3000); } }
      }
  }

  const updateProgress = async (id: number, correct: boolean) => {
      const today = getTodayJST();
      const [currentWord] = questQueue.slice(currentIndex, currentIndex + 1);
      
      const { data: currentLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).single();
      
      const newEntry: ActivityLog = { time: getJSTTimeString(), word: currentWord?.kanji || "不明", mode: MODE_NAMES[mode] || mode, result: correct ? 'correct' : 'incorrect' };
      const updatedDetails = [...(currentLog?.details || []), newEntry];
      const newCount = correct ? (currentLog?.count || 0) + 1 : (currentLog?.count || 0);
      const isCompleted = newCount >= currentGameGoal;
      
      const additionalTime = pendingTimeRef.current;
      const additionalViews = pendingViewsRef.current;
      pendingTimeRef.current = 0; pendingViewsRef.current = 0;
      const newTime = (currentLog?.study_time_seconds || 0) + additionalTime;
      const newViews = (currentLog?.collection_views || 0) + additionalViews;

      const logData = { count: newCount, is_completed: isCompleted, details: updatedDetails, study_time_seconds: newTime, collection_views: newViews };
      
      if (currentLog) await supabase.from('daily_logs').update(logData).eq('id', currentLog.id);
      else await supabase.from('daily_logs').insert([{ user_id: currentUser.id, date: today, streak: currentLog?.streak || 0, ...logData }]);
      
      setDailyProgress((prev: any) => ({ ...prev, ...logData })); 

      const { data: progressData } = await supabase.from('user_progress').select('status, mistake_count, is_writing_master').eq('user_id', currentUser.id).eq('question_id', id).single();
      let newStatus = progressData?.status || 'learning'; let newMistake = progressData?.mistake_count || 0;
      if (correct) { if (newStatus === 'learning') newStatus = 'bronze'; else if (newStatus === 'bronze') newStatus = 'silver'; else if (newStatus === 'silver') newStatus = 'gold'; } 
      else { newMistake += 1; if (newStatus === 'gold' || newStatus === 'mastered') newStatus = 'silver'; else if (newStatus === 'silver') newStatus = 'bronze'; else newStatus = 'learning'; }

      const isWritingMode = ((mode === 'weekend') ? inputMode : (selectedInputMode === 'typing_read' ? 'typing' : 'quiz')) === 'typing' || rickMode === 'write' || inputMode === 'canvas' || inputMode === 'self';
      const newWritingMaster = (correct && isWritingMode) ? true : (progressData?.is_writing_master || false);

      await supabase.from('user_progress').upsert({ user_id: currentUser.id, question_id: id, status: newStatus, mistake_count: newMistake, is_writing_master: newWritingMaster, last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id, question_id' });
  }

  const nextQuestion = async () => {
      setIsTransitioning(true); stopSpeaking(); 
      setTimeout(async () => {
          const next = currentIndex + 1
          setGameStep(0);
          if (next >= questQueue.length) {
              playSound('clear');
              confetti({ particleCount: 300, spread: 100, origin: { y: 0.6 } });

              await savePendingData();

              let currentStreak = dailyProgress.streak || 0;
              
              if (mode === 'daily') {
                  const { data: yLogData } = await supabase.from('daily_logs').select('streak').eq('user_id', currentUser.id).eq('date', getYesterdayJST()).single();
                  const [yLog] = [yLogData];
                  currentStreak = (yLog?.streak || 0) + 1;
                  await supabase.from('daily_logs').update({ is_completed: true, streak: currentStreak }).eq('user_id', currentUser.id).eq('date', getTodayJST());
                  setDailyProgress((prev: any) => ({ ...prev, is_completed: true, streak: currentStreak }));

                  const goalDays = challengeSettings.reward_goal_days || 14;
                  const rewardWord = challengeSettings.reward_text || '好きなおやつ';
                  const isRewardDay = currentStreak > 0 && (currentStreak % goalDays === 0);

                  if (isRewardDay) {
                      const newOwned = (challengeSettings.owned_rewards || 0) + 1;
                      const newTotal = (challengeSettings.total_earned_rewards || 0) + 1;
                      await supabase.from('challenge_settings')
                        .update({ owned_rewards: newOwned, total_earned_rewards: newTotal })
                        .eq('target_user_id', currentUser.id);
                      
                      setChallengeSettings((prev: any) => ({ ...prev, owned_rewards: newOwned, total_earned_rewards: newTotal }));
                      setSpecialRewardMsg(`🎊 ${currentStreak}日達成！\n「${rewardWord}」のストックが\n1個増えたワン！🎁`);
                  } else {
                      setSpecialRewardMsg('');
                  }
              }

              const totalSec = dailyProgress.study_time_seconds || 0;
              const views = dailyProgress.collection_views || 0;
              
              let chestCount = 0;
              if (totalSec >= 600) {
                  chestCount = 1; 
                  if (dailyProgress.count >= 10) chestCount += 1; 
                  chestCount += Math.floor(views / 10); 
                  chestCount += Math.floor(Math.max(0, totalSec - 600) / 300); 
              }
              chestCount = Math.min(10, chestCount);

              const { data: tipsData } = await supabase.from(currentUser.defaultTipTable).select('content');
              const defaults = currentUser.id === 'brother' ? ["ダイヤモンドはY座標-58付近で見つかるよ！"] : ["柔軟体操は毎日やると効果的だワン！"];
              const availableTips = tipsData?.length ? tipsData.map((t: any) => t.content) : defaults;
              const shuffled = [...availableTips].sort(() => 0.5 - Math.random());

              if (chestCount > 0) {
                  const rewards = shuffled.slice(0, chestCount);
                  setRewardTipsList(rewards);
              } else { setRewardTipsList([]); }

              setView('result');
          } else {
              setCurrentIndex(next); 
              const { data: all } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target); 
              const [word] = questQueue.slice(next, next + 1);
              if (all) prepareQuestion(word, all)
          }
          setIsTransitioning(false);
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
          {log?.is_completed && <img src="/Rick.png" alt="Rick" className="absolute inset-0 w-8 h-8 object-cover rounded-full opacity-90 shadow-md" />}
        </div>
      );
    }
    return (
        <div className="bg-stone-50 p-4 rounded-xl shadow-inner border-2 border-stone-100">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))} className="text-stone-400 font-bold px-3 bg-white rounded-lg shadow-sm">&lt;</button>
                <h3 className="font-bold text-stone-600">{year}年 {month + 1}月</h3>
                <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} className="text-stone-400 font-bold px-3 bg-white rounded-lg shadow-sm">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-2">{weekLabels}{days}</div>
        </div>
    );
  };

  if (view === 'menu') {
    return (
      <MenuScreen 
        currentUser={currentUser} setCurrentUser={setCurrentUser} dailyProgress={dailyProgress} challengeSettings={challengeSettings}
        targetKyu={targetKyu} setTargetKyu={setTargetKyu} selectedInputMode={selectedInputMode} setSelectedInputMode={setSelectedInputMode}
        rickMode={rickMode} setRickMode={setRickMode} reviewCandidates={reviewCandidates} reviewRevealed={reviewRevealed} toggleReviewReveal={toggleReviewReveal}
        hasParentChallenge={hasParentChallenge} startGame={startGame} setView={(v) => { savePendingData(); setView(v); }} fetchCollection={fetchCollection} renderCalendar={renderCalendar}
        stopSpeaking={stopSpeaking} fetchAdminStats={fetchAdminStats} setAdminTargetUser={setAdminTargetUser} renderReading={renderReading}
      />
    );
  }

  if (view === 'admin') {
    return (
      <AdminScreen 
        currentUser={currentUser} setView={(v) => { savePendingData(); setView(v); }} adminTargetUser={adminTargetUser} setAdminTargetUser={setAdminTargetUser}
        fetchAdminStats={fetchAdminStats} fetchAllWordsForEdit={fetchAllWordsForEdit} stats={stats} challengeSettings={challengeSettings} setChallengeSettings={setChallengeSettings}
        saveChallengeSettings={saveChallengeSettings} sendLineToChild={sendLineToChild} editStreak={editStreak} setEditStreak={setEditStreak}
        handleSaveStreak={handleSaveStreak} handleAddWord={handleAddWord} allWordsList={allWordsList} toggleMasterStatus={toggleMasterStatus}
        handleDeleteWord={handleDeleteWord} monthlyLogs={monthlyLogs} selectedLogDate={selectedLogDate} setSelectedLogDate={setSelectedLogDate} renderCalendar={renderCalendar}
      />
    );
  }

  if (view === 'game' || view === 'rick_challenge') {
    return (
      <GameScreen 
        currentUser={currentUser} view={view} mode={mode} questQueue={questQueue} currentIndex={currentIndex} isTransitioning={isTransitioning}
        selectedInputMode={selectedInputMode} rickMode={rickMode} inputMode={inputMode} langMode={langMode} gameStep={gameStep} setGameStep={setGameStep}
        weekendPhase={weekendPhase} bossHp={bossHp} currentGameGoal={currentGameGoal} isBossAttacked={isBossAttacked} showRick={showRick} message={message}
        showHint={showHint} showFlashAnswer={showFlashAnswer} mistakeCount={mistakeCount} feedbackMsg={feedbackMsg} options={options}
        userAnswer={userAnswer} setUserAnswer={setUserAnswer} isListening={isListening} isDrawing={isDrawing} canvasRef={canvasRef}
        startDrawing={startDrawing} draw={draw} stopDrawing={stopDrawing} clearCanvas={clearCanvas} startListening={startListening}
        checkAnswer={checkAnswer} handleSelfJudge={handleSelfJudge} nextQuestion={nextQuestion} stopSpeaking={stopSpeaking} setView={(v) => { savePendingData(); setView(v); }}
        renderReading={renderReading} speakWord={speakWord} getFullReading={getFullReading}
      />
    );
  }

  if (view === 'collection') {
    return (
      <CollectionScreen 
         currentUser={currentUser} setView={(v) => { savePendingData(); setView(v); }} allWordsList={allWordsList}
         speakWord={speakWord} renderReading={renderReading} getFullReading={getFullReading}
         stopSpeaking={stopSpeaking} onViewCard={handleViewCollectionCard}
      />
    );
  }

  if (view === 'result') {
    const isRewardRoom = rewardTipsList.length > 0;
    const totalSec = dailyProgress.study_time_seconds || 0;
    const remainingSec = Math.max(0, 600 - totalSec);
    const m = Math.floor(remainingSec / 60); const s = remainingSec % 60;
    const progressPercent = Math.min(100, (totalSec / 600) * 100);

    const handleOpenChest = async (index: number) => {
        if (!openedChests.includes(index)) {
            playSound('chest');
            setOpenedChests([...openedChests, index]);
            confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });

            const tipText = rewardTipsList[index];
            const currentUnlocked = challengeSettings?.unlocked_tips || [];
            
            if (!currentUnlocked.includes(tipText)) {
                const newUnlocked = [...currentUnlocked, tipText];
                setChallengeSettings((prev: any) => ({ ...prev, unlocked_tips: newUnlocked }));
                await supabase.from('challenge_settings').update({ unlocked_tips: newUnlocked }).eq('target_user_id', currentUser.id);
            }
        }
    }

    if (isRewardRoom) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start p-6 pt-12">
                <h2 className="text-3xl font-black text-yellow-400 mb-2 drop-shadow-md animate-pulse">✨ 秘密のご褒美部屋 ✨</h2>
                <p className="text-slate-300 font-bold mb-8 text-sm">宝箱をタップして開けてみよう！</p>
                
                {specialRewardMsg && (
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-1 rounded-2xl mb-8 animate-in zoom-in w-full max-w-sm">
                        <div className="bg-slate-900 p-4 rounded-xl text-center">
                            <p className="text-yellow-400 font-black whitespace-pre-wrap leading-relaxed">{specialRewardMsg}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-lg mb-8">
                    {rewardTipsList.map((tip, index) => {
                        const isOpen = openedChests.includes(index);
                        return (
                            <div key={index} onClick={() => handleOpenChest(index)} className={`relative flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all cursor-pointer ${isOpen ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:scale-105 hover:bg-slate-700'}`}>
                                <div className="text-5xl mb-3 drop-shadow-lg transition-transform duration-300">{isOpen ? '🎁' : '📦'}</div>
                                {isOpen ? (
                                    <p className="text-xs font-bold text-sky-300 leading-relaxed animate-in fade-in slide-in-from-bottom-2 text-center break-words w-full h-full whitespace-pre-wrap">{tip}</p>
                                ) : (
                                    <p className="text-xs font-black text-yellow-500 animate-pulse">TAP TO OPEN!</p>
                                )}
                            </div>
                        )
                    })}
                </div>

                <button onClick={() => setView('menu')} className="mt-auto w-full max-w-sm bg-slate-700 text-slate-300 font-black py-4 rounded-2xl shadow-lg active:scale-95 transition border-2 border-slate-600 hover:bg-slate-600 hover:text-white">村へもどる 🐾</button>
            </div>
        );
    } else {
        return (
            <div className={`min-h-screen ${currentUser.light} flex flex-col items-center justify-center p-6`}>
                <div className="bg-white rounded-[3rem] shadow-2xl p-8 w-full max-w-sm text-center border-4 border-stone-200">
                    <h2 className="text-3xl font-black text-emerald-500 mb-4">クリア！👏</h2>
                    <img src="/Rick.png" alt="Rick" className="w-32 h-32 mx-auto rounded-full border-4 border-stone-100 mb-6 shadow-md object-cover" />
                    
                    <div className="bg-stone-50 p-5 rounded-2xl mb-6 text-left border-2 border-stone-100">
                        <p className="text-sm font-black text-stone-700 mb-2 flex items-center gap-1">🔒 ご褒美部屋はまだ閉まっている…</p>
                        <p className="text-xs font-bold text-stone-500 mb-4 leading-relaxed">
                            扉を開くには、合計10分の学習が必要だワン！<br/>図鑑で新しい言葉の由来を読むのもオススメ！
                        </p>
                        <div className="w-full bg-stone-200 rounded-full h-4 mb-1 overflow-hidden shadow-inner">
                            <div className="bg-emerald-400 h-4 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <p className="text-[10px] font-black text-stone-400 text-right">あと {m}分 {s}秒</p>
                    </div>

                    <div className="space-y-3">
                        <button onClick={() => setView('collection')} className="w-full bg-sky-500 text-white font-black py-3 rounded-xl shadow-md active:scale-95 transition">📖 図鑑で勉強する</button>
                        <button onClick={() => setView('menu')} className="w-full bg-stone-100 text-stone-500 font-black py-3 rounded-xl active:scale-95 transition hover:bg-stone-200">メニューにもどる</button>
                    </div>
                </div>
            </div>
        );
    }
  }

  return null;
}