'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from "@/lib/supabaseClient";
import confetti from 'canvas-confetti'
import { USERS, MODE_NAMES, CATEGORIES } from '@/lib/constants'
import type { KanjiWord, ProgressStats } from '@/lib/constants'

// コンポーネントのインポート
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
    const dObj = getJSTDate();
    dObj.setDate(dObj.getDate() - 1);
    return formatDate(dObj);
};
const getJSTTimeString = () => getJSTDate().toLocaleTimeString('ja-JP', { hour12: false });

export default function Home() {
  const [defaultUser] = USERS;
  
  // --- 基本ステート ---
  const [currentUser, setCurrentUser] = useState(defaultUser)
  const [view, setView] = useState<'menu'|'game'|'rick_challenge'|'result'|'admin'|'collection'>('menu')
  const [mode, setMode] = useState<'daily'|'free'|'weekend'|'parent_challenge'|'rick_challenge'|'revenge'>('daily')
  const [loading, setLoading] = useState(false); 
  const [targetKyu, setTargetKyu] = useState<string>('all')
  const [selectedInputMode, setSelectedInputMode] = useState<'quiz_kanji'|'typing_read'|'write_canvas'|'write_self'>('quiz_kanji')
  const [rickMode, setRickMode] = useState<'read'|'think'|'write'>('read')
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

  // --- ゲーム進行ステート ---
  const [currentGameGoal, setCurrentGameGoal] = useState(5); 
  const [questQueue, setQuestQueue] = useState<KanjiWord[]>([]); 
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cachedAllWords, setCachedAllWords] = useState<KanjiWord[]>([]);
  const [bossHp, setBossHp] = useState(10); 
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
  const [options, setOptions] = useState<KanjiWord[]>([])
  const [isListening, setIsListening] = useState(false)
  const [rewardTipsList, setRewardTipsList] = useState<string[]>([]);
  const [openedChests, setOpenedChests] = useState<number[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const pendingTimeRef = useRef(0);
  const pendingViewsRef = useRef(0);

  // --- 基本ヘルパー・音声 ---
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const speakWord = useCallback((text: string) => {
    stopSpeaking();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'ja-JP';
    window.speechSynthesis.speak(uttr);
  }, [stopSpeaking]);

  const playSound = useCallback((type: 'correct'|'wrong'|'clear'|'chest') => {
    const audio = new Audio(`/sounds/${type === 'chest' ? 'clear' : type}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(()=>{});
  }, []);

  const getFullReading = useCallback((reading: string, okurigana?: string | null) => 
    okurigana ? `${reading}${okurigana}` : reading, []);

  const renderReading = useCallback((reading: string, okurigana?: string | null) => {
    if (!okurigana) return <span>{reading}</span>;
    return (
      <span className="inline-flex items-baseline">
        <span>{reading}</span>
        <span className="text-[0.75em] font-bold ml-[1px] opacity-60">{okurigana}</span>
      </span>
    );
  }, []);

  // --- データ取得ロジック ---
  const checkDailyProgress = useCallback(async () => {
    const today = getTodayJST();
    const yesterday = getYesterdayJST();
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).single();
    if (data) {
        const { data: yLog } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', yesterday).single();
        setDailyProgress({ ...data, streak: (yLog?.is_completed) ? (yLog.streak || 0) : 0 });
    } else {
        const { data: yLog } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', yesterday).single();
        setDailyProgress({ id: 0, date: today, count: 0, is_completed: false, details: [], streak: (yLog?.is_completed) ? (yLog.streak || 0) : 0, study_time_seconds: 0, collection_views: 0 });
    }
  }, [currentUser.id]);

  const fetchMonthlyLogs = useCallback(async (targetDate: Date) => {
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const last = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).gte('date', first).lte('date', last);
    if (data) setMonthlyLogs(data);
  }, [currentUser.id]);

  const fetchAdminStats = useCallback(async (targetUser: any) => {
    setLoading(true);
    const { count: totalCount } = await supabase.from('kanji_questions').select('*', { count: 'exact', head: true }).eq('target_user', targetUser.db_target);
    const { data: progress } = await supabase.from('user_progress').select('status, mistake_count, question_id, kanji_questions(kanji, reading, okurigana)').eq('user_id', targetUser.id);
    
    const ranks = { learning: 0, bronze: 0, silver: 0, gold: 0 };
    let weakList: any[] = [];
    progress?.forEach((p: any) => {
        const wd = p.kanji_questions;
        if (p.status === 'gold' || p.status === 'mastered') ranks.gold++; 
        else if (p.status === 'silver') ranks.silver++; 
        else if (p.status === 'bronze') ranks.bronze++;
        if (p.mistake_count > 0 && wd) weakList.push({ word: wd.kanji, meaning: getFullReading(wd.reading, wd.okurigana), mistakes: p.mistake_count });
    });
    ranks.learning = Math.max(0, (totalCount || 0) - ranks.gold - ranks.silver - ranks.bronze);
    weakList.sort((a, b) => b.mistakes - a.mistakes);

    const thirtyDaysAgo = getJSTDate(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: logD } = await supabase.from('daily_logs').select('*').eq('user_id', targetUser.id).gte('date', formatDate(thirtyDaysAgo)).order('date', { ascending: true });
    
    setStats({
        total: totalCount || 0,
        mastered: ranks.gold,
        ranks,
        weakWords: weakList,
        checkWords: [],
        recentLogs: logD ? [...logD].reverse() : [],
        graphData: logD?.map(l => ({ date: l.date.slice(5).replace('-', '/'), count: l.count || 0 })) || [],
        pieData: [
            { name: '未習得', value: ranks.learning },
            { name: 'ブロンズ', value: ranks.bronze },
            { name: 'シルバー', value: ranks.silver },
            { name: 'ゴールド', value: ranks.gold }
        ]
    });

    const { data: challenge } = await supabase.from('challenge_settings').select('*').eq('target_user_id', targetUser.id).single();
    if (challenge) setChallengeSettings(challenge);
    setLoading(false);
  }, [getFullReading]);

  const fetchAllWordsForEdit = useCallback(async () => {
    const { data: words } = await supabase.from('kanji_questions').select('*').eq('target_user', adminTargetUser.db_target).order('id', { ascending: false });
    const { data: progress } = await supabase.from('user_progress').select('question_id, status').eq('user_id', adminTargetUser.id);
    if (words) {
        const sMap = new Map();
        progress?.forEach((p: any) => sMap.set(p.question_id, p.status));
        setAllWordsList(words.map((w: any) => ({ ...w, currentStatus: sMap.get(w.id) || 'learning' })));
    }
  }, [adminTargetUser.db_target, adminTargetUser.id]);

  // --- 管理者アクション関数 (ここが修正のポイント) ---
  const saveChallengeSettings = useCallback(async (settings: any) => {
    setChallengeSettings(settings);
    const { error } = await supabase.from('challenge_settings').upsert({ target_user_id: adminTargetUser.id, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'target_user_id' });
    if (error) alert("保存に失敗しました: " + error.message);
    else alert("設定を保存しました 🐾");
  }, [adminTargetUser.id]);

  const handleSaveStreak = useCallback(async () => {
    const today = getTodayJST();
    const { data: cur } = await supabase.from('daily_logs').select('*').eq('user_id', adminTargetUser.id).eq('date', today).single();
    if (cur) await supabase.from('daily_logs').update({ streak: editStreak }).eq('id', cur.id);
    else await supabase.from('daily_logs').insert([{ user_id: adminTargetUser.id, date: today, count: 0, is_completed: false, streak: editStreak }]);
    alert('連続日数を修正しました');
    fetchAdminStats(adminTargetUser);
  }, [adminTargetUser, editStreak, fetchAdminStats]);

  const handleAddWord = useCallback(async (newWordData: any) => {
    const { error } = await supabase.from('kanji_questions').insert([{ ...newWordData, kanji_level: newWordData.category, target_user: adminTargetUser.db_target }]);
    if (error) alert("追加に失敗しました: " + error.message);
    else {
      alert('単語を追加しました！');
      fetchAllWordsForEdit();
    }
  }, [adminTargetUser.db_target, fetchAllWordsForEdit]);

  const toggleMasterStatus = useCallback(async (id: number, currentStatus: string) => {
    if (currentStatus === 'gold') {
      await supabase.from('user_progress').delete().eq('user_id', adminTargetUser.id).eq('question_id', id);
    } else {
      await supabase.from('user_progress').upsert({ user_id: adminTargetUser.id, question_id: id, status: 'gold', last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id, question_id' });
    }
    fetchAllWordsForEdit();
    fetchAdminStats(adminTargetUser);
  }, [adminTargetUser, fetchAllWordsForEdit, fetchAdminStats]);

  const handleDeleteWord = useCallback(async (id: number) => {
    if (!confirm('本当に削除しますか？')) return;
    const { error } = await supabase.from('kanji_questions').delete().eq('id', id);
    if (error) alert("削除に失敗しました: " + error.message);
    else fetchAllWordsForEdit();
  }, [fetchAllWordsForEdit]);

  const sendLineToChild = useCallback(async (msg: string) => {
    const res = await fetch('/api/line/send', { method: 'POST', body: JSON.stringify({ message: msg }) });
    if (res.ok) alert("LINEを送信しました！🚀");
    else alert("送信に失敗しました");
  }, []);

  // --- ゲームロジック ---
  const prepareQuestion = useCallback((word: KanjiWord, allWords: KanjiWord[]) => {
    setUserAnswer(''); setMessage(''); setShowRick(false); setMistakeCount(0);
    setFeedbackMsg(null); setIsProcessing(false); setIsTransitioning(false);
    setShowHint(false); setShowFlashAnswer(false);
    
    const nextLMode = (selectedInputMode === 'typing_read') ? 'kanji_to_read' : 'read_to_kanji';
    setLangMode(nextLMode);

    if (nextLMode === 'read_to_kanji') {
      speakWord(getFullReading(word.reading, word.okurigana));
    }

    const others = allWords.filter(w => w.id !== word.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    setOptions([word, ...others].sort(() => 0.5 - Math.random()));
  }, [selectedInputMode, speakWord, getFullReading]);

  const startGame = async (selectedMode: any) => {
    setLoading(true); setMode(selectedMode); setOpenedChests([]); setMistakeCount(0);
    const limit = selectedMode === 'weekend' ? (challengeSettings.special_quest_count || 10) : (challengeSettings.quest_count || 5);
    setCurrentGameGoal(limit);
    
    const { data: allW } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target);
    if (!allW?.length) { setLoading(false); return; }
    
    setCachedAllWords(allW);
    const queue = [...allW].sort(() => 0.5 - Math.random()).slice(0, limit);
    setQuestQueue(queue); setCurrentIndex(0); 
    prepareQuestion(queue[0], allW);
    setView('game'); setLoading(false);
  };

  const updateProgress = async (id: number, correct: boolean) => {
    const today = getTodayJST();
    const { data: cLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).single();
    
    const curWord = questQueue[currentIndex];
    const nEntry = { time: getJSTTimeString(), word: curWord?.kanji, mode: MODE_NAMES[mode], result: correct ? 'correct' : 'incorrect' };
    
    const nT = (cLog?.study_time_seconds || 0) + pendingTimeRef.current;
    const nV = (cLog?.collection_views || 0) + pendingViewsRef.current;
    pendingTimeRef.current = 0; pendingViewsRef.current = 0;
    
    const lD = { 
      count: correct ? (cLog?.count || 0) + 1 : (cLog?.count || 0), 
      is_completed: (cLog?.count || 0) >= (currentGameGoal - 1) && correct, 
      details: [...(cLog?.details || []), nEntry], 
      study_time_seconds: nT, 
      collection_views: nV 
    };

    if (cLog) await supabase.from('daily_logs').update(lD).eq('id', cLog.id);
    else await supabase.from('daily_logs').insert([{ user_id: currentUser.id, date: today, streak: 0, ...lD }]);
    
    setDailyProgress((prev: any) => ({ ...prev, ...lD })); 

    const { data: pD } = await supabase.from('user_progress').select('status').eq('user_id', currentUser.id).eq('question_id', id).single();
    let ns = pD?.status || 'learning'; 
    if (correct) { 
        if (ns === 'learning') ns = 'bronze'; 
        else if (ns === 'bronze') ns = 'silver'; 
        else if (ns === 'silver') ns = 'gold'; 
    }
    await supabase.from('user_progress').upsert({ user_id: currentUser.id, question_id: id, status: ns, last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id, question_id' });
  };

  const checkAnswer = async (ans: string, isVoice: boolean = false) => {
    if (isProcessing || showRick) return;
    setIsProcessing(true);
    const cur = questQueue[currentIndex];
    const cor = langMode === 'read_to_kanji' ? cur.kanji : getFullReading(cur.reading, cur.okurigana);
    
    const normalize = (str: string) => str.replace(/[\u30a1-\u30f6]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60)).replace(/[\u3000\s]/g, '');
    const isCorrect = selectedInputMode.includes('quiz') ? (ans === cor) : (normalize(ans) === normalize(cor));

    if (isCorrect) {
        playSound('correct'); setShowRick(true); confetti({ particleCount: 50 });
        setMessage('正解！すごいワン！🎉');
        speakWord(cur.origin_logic ? `${getFullReading(cur.reading, cur.okurigana)}。${cur.origin_logic}` : getFullReading(cur.reading, cur.okurigana));
        await updateProgress(cur.id, true);
    } else {
        playSound('wrong'); 
        const nextMs = mistakeCount + 1;
        setMistakeCount(nextMs);
        setShowHint(true);
        
        if (selectedInputMode.includes('quiz')) {
            const wrongW = options.find(o => (langMode === 'read_to_kanji' ? o.kanji : getFullReading(o.reading, o.okurigana)) === ans);
            if (wrongW && wrongW.id !== cur.id) {
                setFeedbackMsg(<>❌ 選んだ「<span className="font-black text-rose-600">{ans}</span>」は「<span className="font-black text-rose-600">{langMode === 'read_to_kanji' ? getFullReading(wrongW.reading, wrongW.okurigana) : wrongW.kanji}</span>」だよ！</>);
            }
        }

        if (nextMs >= 3) {
            setMessage(`残念... 正解は「${cor}」`);
            setShowRick(true);
        } else if (nextMs === 2) {
            setShowFlashAnswer(true);
            setTimeout(() => setShowFlashAnswer(false), 2000);
        }
        await updateProgress(cur.id, false);
    }
    setIsProcessing(false);
  };

  const nextQuestion = useCallback(async () => {
    setIsTransitioning(true); stopSpeaking(); 
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questQueue.length) {
        playSound('clear');
        if (mode === 'daily') {
            const { data: yLog } = await supabase.from('daily_logs').select('streak').eq('user_id', currentUser.id).eq('date', getYesterdayJST()).single();
            const newStreak = (yLog?.streak || 0) + 1;
            await supabase.from('daily_logs').update({ is_completed: true, streak: newStreak }).eq('user_id', currentUser.id).eq('date', getTodayJST());
        }
        const tSec = dailyProgress.study_time_seconds || 0;
        let cCount = tSec >= 600 ? (1 + Math.floor((tSec - 600) / 300)) : 0;
        if (['write_canvas', 'write_self'].includes(selectedInputMode)) cCount *= 2;
        
        const { data: tips } = await supabase.from(currentUser.defaultTipTable).select('content');
        setRewardTipsList(tips?.map(t => t.content).sort(() => 0.5 - Math.random()).slice(0, Math.min(10, cCount)) || []);
        setView('result');
    } else {
        setCurrentIndex(nextIdx);
        prepareQuestion(questQueue[nextIdx], cachedAllWords);
    }
    setIsTransitioning(false);
  }, [currentIndex, questQueue, cachedAllWords, dailyProgress.study_time_seconds, mode, currentUser, prepareQuestion, stopSpeaking, selectedInputMode, playSound]);

  // --- カレンダー描画関数 ---
  const renderCalendar = useCallback(() => {
    const y = calendarDate.getFullYear();
    const m = calendarDate.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const dayCells = [];
    const labels = ['日', '月', '火', '水', '木', '金', '土'].map(w => (
        <div key={w} className="text-center text-[10px] font-black text-stone-400 mb-1">{w}</div>
    ));

    for (let i = 0; i < firstDay; i++) dayCells.push(<div key={`e-${i}`} className="h-9 w-9"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const log = monthlyLogs.find(l => l.date === dateStr);
        const isToday = dateStr === getTodayJST();
        dayCells.push(
            <div key={d} onClick={() => setSelectedLogDate(dateStr)} className={`h-9 w-9 flex items-center justify-center rounded-full text-xs font-bold relative cursor-pointer hover:bg-stone-100 ${isToday ? currentUser.border + ' border-2 ' + currentUser.light : 'bg-white shadow-sm'}`}>
                <span className={isToday ? currentUser.text : 'text-stone-600'}>{d}</span>
                {log?.is_completed && <img src="/Rick.png" alt="clear" className="absolute inset-0 w-7 h-7 object-cover rounded-full opacity-80" />}
            </div>
        );
    }

    return (
        <div className="bg-stone-50 p-3 rounded-2xl border-2 border-stone-100">
            <div className="flex justify-between items-center mb-2 px-1">
                <button onClick={() => setCalendarDate(new Date(y, m - 1, 1))} className="text-stone-400 font-bold p-1">←</button>
                <h3 className="font-black text-stone-600 text-sm">{y}年 {m + 1}月</h3>
                <button onClick={() => setCalendarDate(new Date(y, m + 1, 1))} className="text-stone-400 font-bold p-1">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1">{labels}{dayCells}</div>
        </div>
    );
  }, [calendarDate, monthlyLogs, currentUser]);

  // --- ライフサイクル ---
  useEffect(() => { 
    const init = async () => {
      await checkDailyProgress();
      await fetchMonthlyLogs(calendarDate);
      
      const { data: chal } = await supabase.from('challenge_settings').select('*').eq('target_user_id', currentUser.id).single();
      if (chal) {
        setHasParentChallenge(chal.mode === 'manual' ? (chal.selected_ids?.length > 0) : (chal.auto_count > 0));
        setChallengeSettings(chal);
      }
    };
    init();
  }, [currentUser.id, calendarDate, view, fetchMonthlyLogs, checkDailyProgress]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (['game', 'collection', 'rick_challenge'].includes(view)) {
      interval = setInterval(() => { pendingTimeRef.current += 1; }, 1000);
    }
    return () => clearInterval(interval);
  }, [view]);

  const navTo = (v: any) => { stopSpeaking(); setShowRick(false); setView(v); };

  // --- メインレンダリング ---
  if (view === 'menu') return <MenuScreen {...{currentUser, setCurrentUser, dailyProgress, challengeSettings, targetKyu, setTargetKyu, selectedInputMode, setSelectedInputMode, rickMode, setRickMode, reviewCandidates: [], reviewRevealed: [], toggleReviewReveal: ()=>{}, hasParentChallenge, startGame, setView: navTo, fetchCollection: () => { setView('collection'); fetchAllWordsForEdit(); }, renderCalendar, stopSpeaking, fetchAdminStats: (u) => { fetchAdminStats(u); setAdminTargetUser(u); setView('admin'); }, setAdminTargetUser, renderReading}} />;
  if (view === 'admin') return <AdminScreen {...{currentUser, setView: navTo, adminTargetUser, setAdminTargetUser, fetchAdminStats, fetchAllWordsForEdit, stats, challengeSettings, setChallengeSettings, saveChallengeSettings, sendLineToChild, editStreak, setEditStreak, handleSaveStreak, handleAddWord, allWordsList, toggleMasterStatus, handleDeleteWord, monthlyLogs, selectedLogDate, setSelectedLogDate, renderCalendar}} />;
  if (view === 'collection') return <CollectionScreen {...{currentUser, setView: navTo, allWordsList, speakWord, renderReading, getFullReading, stopSpeaking, onViewCard: () => { pendingViewsRef.current += 1; }}} />;
  
  if (view === 'game' || view === 'rick_challenge') return (
    <GameScreen 
      {...{
        currentUser, view, mode, questQueue, currentIndex, isTransitioning, 
        selectedInputMode, rickMode, inputMode: selectedInputMode.includes('quiz') ? 'quiz' : 'typing', 
        langMode, gameStep: 0, setGameStep: () => {}, weekendPhase: 1, bossHp, currentGameGoal, 
        isBossAttacked: false, showRick, message, showHint, showFlashAnswer, mistakeCount, 
        feedbackMsg, options, userAnswer, setUserAnswer, isListening, isDrawing: false, 
        canvasRef, startDrawing: ()=>{}, draw: ()=>{}, stopDrawing: ()=>{}, clearCanvas: ()=>{}, 
        startListening: () => setIsListening(!isListening), checkAnswer, 
        handleSelfJudge: async(c:boolean)=>{ const w=questQueue[currentIndex]; await updateProgress(w.id, c); nextQuestion(); }, 
        nextQuestion, stopSpeaking, setView: navTo, renderReading, speakWord, getFullReading
      }} 
    />
  );

  if (view === 'result') {
    const isRRoom = rewardTipsList.length > 0;
    const tS = dailyProgress.study_time_seconds || 0;
    const progP = Math.min(100, (tS / 600) * 100);

    return (
        <div className={`min-h-screen ${isRRoom ? 'bg-slate-900' : currentUser.light} flex flex-col items-center justify-center p-6 text-center font-sans`}>
            {isRRoom ? (
                <div className="w-full max-w-lg">
                    <h2 className="text-3xl font-black text-yellow-400 mb-6">✨ ご褒美部屋 ✨</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        {rewardTipsList.map((tip, idx) => (
                            <div key={idx} onClick={async () => {
                                if(!openedChests.includes(idx)) {
                                    playSound('chest'); setOpenedChests([...openedChests, idx]); confetti({ particleCount: 30 });
                                    const nU = [...(challengeSettings?.unlocked_tips || []), tip];
                                    setChallengeSettings((p:any) => ({...p, unlocked_tips: nU}));
                                    await supabase.from('challenge_settings').update({ unlocked_tips: nU }).eq('target_user_id', currentUser.id);
                                }
                            }} className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${openedChests.includes(idx) ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-yellow-500 shadow-lg'}`}>
                                <div className="text-5xl mb-2">{openedChests.includes(idx) ? '🎁' : '📦'}</div>
                                <p className="text-xs font-bold text-sky-300 break-words">{openedChests.includes(idx) ? tip : 'TAP!'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] shadow-2xl p-8 w-full max-w-sm border-4 border-stone-200">
                    <h2 className="text-3xl font-black text-emerald-500 mb-4">クリア！👏</h2>
                    <img src="/Rick.png" alt="Rick" className="w-24 h-24 mx-auto rounded-full mb-6 shadow-md" />
                    <div className="bg-stone-50 p-5 rounded-2xl mb-6 text-left border-2 border-stone-100">
                        <p className="text-xs font-bold text-stone-500 mb-4">あと {Math.floor(Math.max(0, 600 - tS)/60)}分 の学習でトビラが開くワン！</p>
                        <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden"><div className="bg-emerald-400 h-3 transition-all" style={{ width: `${progP}%` }}></div></div>
                    </div>
                </div>
            )}
            <button onClick={() => setView('menu')} className={`mt-8 w-full max-w-sm ${isRRoom ? 'bg-slate-700' : 'bg-stone-800'} text-white font-black py-4 rounded-2xl shadow-lg`}>村へもどる 🐾</button>
        </div>
    );
  }
  return null;
}