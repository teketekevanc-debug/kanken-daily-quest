'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from "@/lib/supabaseClient";
import confetti from 'canvas-confetti'
import { USERS, CATEGORIES, MODE_NAMES } from '@/lib/constants'
import type { KanjiWord, ProgressStats } from '@/lib/constants'

// コンポーネントのインポート
import MenuScreen from '@/components/MenuScreen'
import AdminScreen from '@/components/AdminScreen'
import GameScreen from '@/components/GameScreen'
import CollectionScreen from '@/components/CollectionScreen'

// --- ヘルパー関数 ---
const getJSTDate = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
const formatDate = (dateObj: Date) => {
    const yParts = [dateObj.getFullYear()]; const [y] = yParts;
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
const getTodayJST = () => formatDate(getJSTDate());
const getYesterdayJST = () => {
    const dObj = getJSTDate();
    dObj.setDate(dObj.getDate() - 1);
    return formatDate(dObj);
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

  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [isDrawing, setIsDrawing] = useState(false);
  const pendingTimeRef = useRef(0);
  const pendingViewsRef = useRef(0);

  // --- 型エラー回避用の橋渡し関数 ---
  const navTo = (v: any) => setView(v);

  // --- 学習タイマー ---
  useEffect(() => {
      let intervalId: NodeJS.Timeout;
      if (view === 'game' || view === 'collection' || view === 'rick_challenge') {
          intervalId = setInterval(() => { pendingTimeRef.current += 1; }, 1000);
      }
      return () => clearInterval(intervalId);
  }, [view]);

  const handleViewCollectionCard = () => { pendingViewsRef.current += 1; }

  const savePendingData = async () => {
      if (pendingTimeRef.current === 0 && pendingViewsRef.current === 0) return;
      const tDay = getTodayJST();
      const { data: cLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', tDay).single();
      if (cLog) {
          const nTParts = [(cLog.study_time_seconds || 0) + pendingTimeRef.current]; const [nT] = nTParts;
          const nVParts = [(cLog.collection_views || 0) + pendingViewsRef.current]; const [nV] = nVParts;
          await supabase.from('daily_logs').update({ study_time_seconds: nT, collection_views: nV }).eq('id', cLog.id);
          setDailyProgress((prev: any) => ({ ...prev, study_time_seconds: nT, collection_views: nV }));
          pendingTimeRef.current = 0; pendingViewsRef.current = 0;
      }
  }

  // --- UIヘルパー ---
  const renderReading = (reading: string, okurigana?: string | null) => {
      if (!okurigana) return <span>{reading}</span>;
      return (<span className="inline-flex items-baseline"><span>{reading}</span><span className="text-[0.75em] font-bold ml-[1px] opacity-60">{okurigana}</span></span>);
  };
  const getFullReading = useCallback((reading: string, okurigana?: string | null) => okurigana ? `${reading}${okurigana}` : reading, []);

  // --- 音声・サウンド ---
  const playSound = (type: 'correct'|'wrong'|'clear'|'chest') => { const audio = new Audio(`/sounds/${type === 'chest' ? 'clear' : type}.mp3`); audio.volume = 0.5; audio.play().catch(()=>{}); }
  const speakWord = useCallback((text: string) => { window.speechSynthesis.cancel(); const uttr = new SpeechSynthesisUtterance(text); uttr.lang = 'ja-JP'; window.speechSynthesis.speak(uttr); }, []);
  const stopSpeaking = () => window.speechSynthesis.cancel();

  // ★ 追加：音声入力開始関数 (ビルドエラーの直接原因を修正)
  const startListening = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    const rec = new SpeechRec();
    rec.lang = 'ja-JP';
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onresult = (e: any) => {
      const resultsArr = Array.from(e.results);
      const [lastResult] = resultsArr.slice(-1);
      const [alt] = Array.from(lastResult as any);
      const transcriptArr = [(alt as any).transcript];
      const [text] = transcriptArr;
      setUserAnswer(text);
      if ((lastResult as any).isFinal) checkAnswer(text);
    };
    rec.start();
  };

  // --- 各種操作 ---
  const toggleReviewReveal = (id: number) => { setReviewRevealed(prev => prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]); };

  const fetchCollection = async () => { setLoading(true); await fetchAllWordsForEdit(); setLoading(false); setView('collection'); };

  const fetchMonthlyLogs = async (targetDate: Date = calendarDate) => {
    const yParts = [targetDate.getFullYear()]; const [y] = yParts;
    const mParts = [targetDate.getMonth()]; const [m] = mParts;
    const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).gte('date', firstDay).lte('date', lastDay)
    if (data) setMonthlyLogs(data)
  }

  const renderCalendar = () => {
    const yParts = [calendarDate.getFullYear()]; const [y] = yParts;
    const mParts = [calendarDate.getMonth()]; const [m] = mParts;
    const dInMParts = [new Date(y, m + 1, 0).getDate()]; const [dInM] = dInMParts;
    const fDayParts = [new Date(y, m, 1).getDay()]; const [fDay] = fDayParts;
    const dayCells = [];
    const labels = ['日', '月', '火', '水', '木', '金', '土'].map(w => (<div key={w} className="text-center text-xs font-bold text-stone-400 mb-1">{w}</div>));
    for (let i = 0; i < fDay; i++) dayCells.push(<div key={`e-${i}`} className="h-10 w-10"></div>);
    for (let d = 1; d <= dInM; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = monthlyLogs.find(l => l.date === dateStr);
      const isTodayArr = [dateStr === getTodayJST()]; const [isToday] = isTodayArr;
      dayCells.push(
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
                <h3 className="font-bold text-stone-600">{y}年 {m + 1}月</h3>
                <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} className="text-stone-400 font-bold px-3 bg-white rounded-lg shadow-sm">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-2">{labels}{dayCells}</div>
        </div>
    );
  };

  // --- キャンバス ---
  const clearCanvas = () => { const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); };
  const getPointerPos = (e: any) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const { clientX, clientY, touches } = e;
    const tArr = Array.from(touches || []) as unknown as Touch[]; const [firstT] = tArr;
    return { x: (clientX ?? firstT?.clientX ?? 0) - rect.left, y: (clientY ?? firstT?.clientY ?? 0) - rect.top };
  };
  const startDrawing = (e: any) => { setIsDrawing(true); const { x, y } = getPointerPos(e); const ctx = canvasRef.current?.getContext('2d'); if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); } };
  const draw = (e: any) => { if (!isDrawing) return; const { x, y } = getPointerPos(e); const ctx = canvasRef.current?.getContext('2d'); if (ctx) { ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = '#333'; ctx.lineTo(x, y); ctx.stroke(); } };
  const stopDrawing = () => setIsDrawing(false);

  // --- データ取得 ---
  const checkDailyProgress = async () => {
    const tDay = getTodayJST(); const yDayArr = [getYesterdayJST()]; const [yDay] = yDayArr;
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', tDay).limit(1).single()
    if (data) {
        if (!data.is_completed) {
            const { data: yD } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', yDay).single();
            const [yLog] = [yD]; setDailyProgress({ ...data, streak: (yLog?.is_completed) ? (yLog.streak || 0) : 0 });
        } else setDailyProgress(data);
    } else {
        const { data: yD } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', yDay).single();
        const [yLog] = [yD]; setDailyProgress({ id: 0, date: tDay, count: 0, is_completed: false, details: [], streak: (yLog?.is_completed) ? (yLog.streak || 0) : 0, study_time_seconds: 0, collection_views: 0 })
    }
  }

  const checkChallengeStatus = async () => {
    const { data } = await supabase.from('challenge_settings').select('*').eq('target_user_id', currentUser.id).single()
    if (data) {
        setHasParentChallenge((data.mode === 'manual' ? (data.selected_ids?.length > 0) : (data.auto_count > 0)))
        setChallengeSettings((prev: any) => ({ ...prev, ...data }));
    } else setHasParentChallenge(false)
  }

  const fetchReviewCandidates = async () => {
    const { data: allW } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target);
    const { data: prog } = await supabase.from('user_progress').select('*').eq('user_id', currentUser.id);
    if (!allW || !prog) return;
    const nowTs = new Date().getTime();
    setReviewCandidates(prog.map((p: any) => {
      const word = allW.find(w => w.id === p.question_id); if (!word) return null;
      const diffDays = (nowTs - new Date(p.last_reviewed_at || new Date()).getTime()) / (1000 * 60 * 60 * 24); 
      if (diffDays < 1) return null;
      return { ...word, riskScore: diffDays * ((p.mistake_count || 0) + 1) };
    }).filter(i => i !== null).sort((a, b) => b!.riskScore - a!.riskScore).slice(0, 3) as KanjiWord[]);
  }

  // --- 管理者機能 ---
  const fetchAllWordsForEdit = async () => {
    const { data: w } = await supabase.from('kanji_questions').select('*').eq('target_user', adminTargetUser.db_target).order('id', { ascending: false });
    const { data: p } = await supabase.from('user_progress').select('question_id, status').eq('user_id', adminTargetUser.id);
    if (w) {
        const sMap = new Map<number, string>(); p?.forEach((item: any) => sMap.set(item.question_id, item.status));
        setAllWordsList(w.map((word: any) => ({ ...word, currentStatus: sMap.get(word.id) || 'learning' })));
    }
  }

  const fetchAdminStats = async (targetUser: any = adminTargetUser) => {
      setLoading(true)
      const { count: tC } = await supabase.from('kanji_questions').select('*', { count: 'exact', head: true }).eq('target_user', targetUser.db_target)
      const { data: pArr } = await supabase.from('user_progress').select('status, mistake_count, question_id, kanji_questions(kanji, reading, okurigana)').eq('user_id', targetUser.id)
      const ranks = { learning: 0, bronze: 0, silver: 0, gold: 0 }; let weakList: any[] = []; 
      pArr?.forEach((pI: any) => {
          const wd = pI.kanji_questions;
          if (pI.status === 'gold') ranks.gold++; else if (pI.status === 'silver') ranks.silver++; else if (pI.status === 'bronze') ranks.bronze++; else ranks.learning++;
          if (pI.mistake_count > 0 && wd) weakList.push({ word: wd.kanji, meaning: getFullReading(wd.reading, wd.okurigana), mistakes: pI.mistake_count });
      });
      ranks.learning = Math.max(0, (tC || 0) - ranks.gold - ranks.silver - ranks.bronze); 
      weakList.sort((a, b) => b.mistakes - a.mistakes);
      const tDA = getJSTDate(); tDA.setDate(tDA.getDate() - 30);
      const { data: logD } = await supabase.from('daily_logs').select('*').eq('user_id', targetUser.id).gte('date', formatDate(tDA)).order('date', { ascending: true })
      const graphData = logD?.map(l => ({ date: l.date.slice(5).replace('-', '/'), count: l.count || 0 })) || []
      const pieDataArr = [ { name: `未習得`, value: ranks.learning }, { name: `ブロンズ`, value: ranks.bronze }, { name: `シルバー`, value: ranks.silver }, { name: `ゴールド`, value: ranks.gold } ];
      const revL = logD ? [...logD].reverse() : []; const [latest] = revL; setEditStreak(latest ? (latest.streak || 0) : 0);
      setStats({ total: tC || 0, mastered: ranks.gold, ranks, weakWords: weakList, checkWords: [], recentLogs: revL, graphData, pieData: pieDataArr })
      const { data: chal } = await supabase.from('challenge_settings').select('*').eq('target_user_id', targetUser.id).single()
      if (chal) setChallengeSettings(chal);
      setLoading(false); setView('admin')
  }

  const handleSaveStreak = async () => {
      const today = getTodayJST();
      const { data: cL } = await supabase.from('daily_logs').select('*').eq('user_id', adminTargetUser.id).eq('date', today).limit(1).single();
      if (cL) await supabase.from('daily_logs').update({ streak: editStreak }).eq('id', cL.id);
      else await supabase.from('daily_logs').insert([{ user_id: adminTargetUser.id, date: today, count: 0, is_completed: false, streak: editStreak }]);
      alert('修正しました'); fetchAdminStats(adminTargetUser);
  }

  const handleAddWord = async (newW: any) => {
      const payload = { ...newW, kanji_level: newW.category, target_user: adminTargetUser.db_target };
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

  // --- ゲームロジック ---
  const startGame = async (selectedMode: any) => {
      setLoading(true); setMode(selectedMode); setOpenedChests([]); setRewardTipsList([]); setSpecialRewardMsg(''); setMistakeCount(0);
      const qLA = [selectedMode === 'weekend' ? (challengeSettings.special_quest_count || 10) : (challengeSettings.quest_count || 5)];
      const [QUEST_LIMIT] = qLA; setCurrentGameGoal(QUEST_LIMIT);
      if (selectedMode === 'weekend') { setWeekendPhase(1); setBossHp(QUEST_LIMIT); } 
      const { data: allW } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target)
      if (!allW?.length) return setLoading(false);
      const queue = [...allW].sort(() => 0.5 - Math.random()).slice(0, (selectedMode === 'daily' || selectedMode === 'weekend') ? QUEST_LIMIT : 20);
      setQuestQueue(queue); setCurrentIndex(0); 
      const [first] = queue; if(first) prepareQuestion(first, allW);
      setView('game'); setLoading(false)
  }

  const prepareQuestion = (word: KanjiWord, allWords: KanjiWord[]) => {
      setUserAnswer(''); setMessage(''); setShowRick(false); setMistakeCount(0);
      const nextLMode = (selectedInputMode === 'typing_read') ? 'kanji_to_read' : 'read_to_kanji';
      setLangMode(nextLMode);
      if (nextLMode === 'read_to_kanji') speakWord(getFullReading(word.reading, word.okurigana));
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
      const { data: cD } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).single();
      const [curLog] = [cD];
      const [curWord] = questQueue.slice(currentIndex, currentIndex + 1);
      const nEntry = { time: getJSTTimeString(), word: curWord?.kanji, mode: MODE_NAMES[mode], result: correct ? 'correct' : 'incorrect' };
      const uDetails = [...(curLog?.details || []), nEntry];
      const nCount = correct ? (curLog?.count || 0) + 1 : (curLog?.count || 0);
      const isC = nCount >= currentGameGoal;
      const aTimeArr = [pendingTimeRef.current]; const [aTime] = aTimeArr; pendingTimeRef.current = 0;
      const aViewsArr = [pendingViewsRef.current]; const [aViews] = aViewsArr; pendingViewsRef.current = 0;
      const nT = (curLog?.study_time_seconds || 0) + aTime;
      const nV = (curLog?.collection_views || 0) + aViews;
      const lD = { count: nCount, is_completed: isC, details: uDetails, study_time_seconds: nT, collection_views: nV };
      if (curLog) await supabase.from('daily_logs').update(lD).eq('id', curLog.id);
      else await supabase.from('daily_logs').insert([{ user_id: currentUser.id, date: today, streak: curLog?.streak || 0, ...lD }]);
      setDailyProgress((prev: any) => ({ ...prev, ...lD })); 
      const { data: pD } = await supabase.from('user_progress').select('status').eq('user_id', currentUser.id).eq('question_id', id).single();
      let ns = pD?.status || 'learning'; if (correct) { if (ns === 'learning') ns = 'bronze'; else if (ns === 'bronze') ns = 'silver'; else if (ns === 'silver') ns = 'gold'; }
      await supabase.from('user_progress').upsert({ user_id: currentUser.id, question_id: id, status: ns, last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id, question_id' });
  }

  const nextQuestion = async () => {
      setIsTransitioning(true); stopSpeaking(); 
      setTimeout(async () => {
          const nextArr = [currentIndex + 1]; const [nextI] = nextArr;
          if (nextI >= questQueue.length) {
              playSound('clear'); await savePendingData();
              let curSArr = [dailyProgress.streak || 0]; let [curS] = curSArr;
              if (mode === 'daily') {
                  const { data: yLD } = await supabase.from('daily_logs').select('streak').eq('user_id', currentUser.id).eq('date', getYesterdayJST()).single();
                  const [yLog] = [yLD]; curS = (yLog?.streak || 0) + 1;
                  await supabase.from('daily_logs').update({ is_completed: true, streak: curS }).eq('user_id', currentUser.id).eq('date', getTodayJST());
                  setDailyProgress((prev: any) => ({ ...prev, is_completed: true, streak: curS }));
                  const gArr = [challengeSettings.reward_goal_days || 14]; const [goalDays] = gArr;
                  if (curS > 0 && (curS % goalDays === 0)) {
                      const nOA = [(challengeSettings.owned_rewards || 0) + 1]; const [newOwned] = nOA;
                      const nTA = [(challengeSettings.total_earned_rewards || 0) + 1]; const [newTotal] = nTA;
                      await supabase.from('challenge_settings').update({ owned_rewards: newOwned, total_earned_rewards: newTotal }).eq('target_user_id', currentUser.id);
                      setChallengeSettings((prev: any) => ({ ...prev, owned_rewards: newOwned, total_earned_rewards: newTotal }));
                      setSpecialRewardMsg(`🎊 ${curS}日達成！ご褒美GETだワン！🎁`);
                  }
              }
              const totalSec = dailyProgress.study_time_seconds || 0;
              const cCountArr = [totalSec >= 600 ? (1 + Math.floor(Math.max(0, totalSec - 600) / 300) + Math.floor((dailyProgress.collection_views || 0) / 10)) : 0];
              const [cCount] = cCountArr;
              const { data: t } = await supabase.from(currentUser.defaultTipTable).select('content');
              setRewardTipsList(t?.map((tI: any) => tI.content).sort(() => 0.5 - Math.random()).slice(0, Math.min(cCount, 10)) || []);
              setView('result');
          } else {
              setCurrentIndex(nextI);
              const [word] = questQueue.slice(nextI, nextI + 1);
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

  // --- レンダリング ---
  if (view === 'menu') return <MenuScreen {...{currentUser, setCurrentUser, dailyProgress, challengeSettings, targetKyu, setTargetKyu, selectedInputMode, setSelectedInputMode, rickMode, setRickMode, reviewCandidates, reviewRevealed, toggleReviewReveal, hasParentChallenge, startGame, setView: navTo, fetchCollection, renderCalendar, stopSpeaking, fetchAdminStats, setAdminTargetUser, renderReading}} />;
  if (view === 'admin') return <AdminScreen {...{currentUser, setView: navTo, adminTargetUser, setAdminTargetUser, fetchAdminStats, fetchAllWordsForEdit, stats, challengeSettings, setChallengeSettings, saveChallengeSettings, sendLineToChild, editStreak, setEditStreak, handleSaveStreak, handleAddWord, allWordsList, toggleMasterStatus, handleDeleteWord, monthlyLogs, selectedLogDate, setSelectedLogDate, renderCalendar}} />;
  if (view === 'collection') return <CollectionScreen {...{currentUser, setView: navTo, allWordsList, speakWord, renderReading, getFullReading, stopSpeaking, onViewCard: handleViewCollectionCard}} />;
  if (view === 'game' || view === 'rick_challenge') return <GameScreen {...{currentUser, view, mode, questQueue, currentIndex, isTransitioning, selectedInputMode, rickMode, inputMode, langMode, gameStep: 0, setGameStep: () => {}, weekendPhase, bossHp, currentGameGoal, isBossAttacked, showRick, message, showHint, showFlashAnswer, mistakeCount, feedbackMsg: null, options, userAnswer, setUserAnswer, isListening, isDrawing, canvasRef, startDrawing, draw, stopDrawing, clearCanvas, startListening, checkAnswer, handleSelfJudge: (c: boolean) => { const [w] = questQueue.slice(currentIndex, currentIndex+1); updateProgress(w.id, c); }, nextQuestion, stopSpeaking, setView: navTo, renderReading, speakWord, getFullReading}} />;

  if (view === 'result') {
    const isRRArr = [rewardTipsList.length > 0]; const [isRRoom] = isRRArr;
    const tS = dailyProgress.study_time_seconds || 0;
    const remArr = [Math.max(0, 600 - tS)]; const [rem] = remArr;
    const mArr = [Math.floor(rem / 60)]; const [m] = mArr; const sArr = [rem % 60]; const [s] = sArr;
    const pPArr = [Math.min(100, (tS / 600) * 100)]; const [progP] = pPArr;
    const handleOpenChest = async (index: number) => {
        if (!openedChests.includes(index)) {
            playSound('chest'); setOpenedChests([...openedChests, index]); confetti({ particleCount: 50 });
            const [tipText] = rewardTipsList.slice(index, index + 1);
            const curUnlockedArr = [challengeSettings?.unlocked_tips || []]; const [curUnlocked] = curUnlockedArr;
            if (!curUnlocked.includes(tipText)) {
                const nUnlocked = [...curUnlocked, tipText];
                setChallengeSettings((prev: any) => ({ ...prev, unlocked_tips: nUnlocked }));
                await supabase.from('challenge_settings').update({ unlocked_tips: nUnlocked }).eq('target_user_id', currentUser.id);
            }
        }
    }
    if (isRRoom) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start p-6 pt-12 text-center font-sans">
                <h2 className="text-3xl font-black text-yellow-400 mb-2 drop-shadow-md">✨ ご褒美部屋 ✨</h2>
                <p className="text-slate-300 font-bold mb-8 text-sm">宝箱をタップして開けてみよう！</p>
                {specialRewardMsg && <div className="bg-slate-800 p-4 rounded-xl border-2 border-yellow-500 mb-8"><p className="text-yellow-400 font-black">{specialRewardMsg}</p></div>}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-lg mb-8">
                    {rewardTipsList.map((tip, idx) => {
                        const isOpenArr = [openedChests.includes(idx)]; const [isOpen] = isOpenArr;
                        return (
                            <div key={idx} onClick={() => handleOpenChest(idx)} className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${isOpen ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-yellow-500 shadow-lg'}`}>
                                <div className="text-5xl mb-3">{isOpen ? '🎁' : '📦'}</div>
                                <p className="text-xs font-bold text-sky-300 leading-relaxed break-words">{isOpen ? tip : 'TAP!'}</p>
                            </div>
                        )
                    })}
                </div>
                <button onClick={() => setView('menu')} className="mt-auto w-full max-w-sm bg-slate-700 text-white font-black py-4 rounded-2xl">村へもどる 🐾</button>
            </div>
        );
    } else {
        return (
            <div className={`min-h-screen ${currentUser.light} flex flex-col items-center justify-center p-6 text-center font-sans`}>
                <div className="bg-white rounded-[3rem] shadow-2xl p-8 w-full max-w-sm border-4 border-stone-200">
                    <h2 className="text-3xl font-black text-emerald-500 mb-4">クリア！👏</h2>
                    <img src="/Rick.png" alt="Rick" className="w-32 h-32 mx-auto rounded-full mb-6 shadow-md" />
                    <div className="bg-stone-50 p-5 rounded-2xl mb-6 text-left border-2 border-stone-100">
                        <p className="text-sm font-black text-stone-700 mb-2">🔒 ご褒美部屋はまだ閉まっている…</p>
                        <p className="text-xs font-bold text-stone-500 mb-4">あと {m}分 {s}秒の学習でトビラが開くワン！</p>
                        <div className="w-full bg-stone-200 rounded-full h-4 overflow-hidden shadow-inner"><div className="bg-emerald-400 h-4 rounded-full transition-all" style={{ width: `${progP}%` }}></div></div>
                    </div>
                    <button onClick={() => setView('menu')} className="w-full bg-stone-800 text-white font-black py-4 rounded-2xl shadow-lg">メニューへもどる</button>
                </div>
            </div>
        );
    }
  }
  return null;
}