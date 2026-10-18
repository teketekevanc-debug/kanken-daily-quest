'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from "@/lib/supabaseClient";
import confetti from 'canvas-confetti'
import { USERS, MODE_NAMES, CATEGORIES, getExamMissionPhase } from '@/lib/constants'
import type { KanjiWord, ProgressStats } from '@/lib/constants'

// コンポーネントのインポート
import MenuScreen from '@/components/MenuScreen'
import AdminScreen from '@/components/AdminScreen'
import GameScreen from '@/components/GameScreen'
import CollectionScreen from '@/components/CollectionScreen'
import StudyTimerPanel from '@/components/StudyTimerPanel'

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
  const [view, setView] = useState<'menu'|'game'|'rick_challenge'|'result'|'result_chest'|'admin'|'collection'>('menu')
  const [mode, setMode] = useState<'daily'|'free'|'weekend'|'parent_challenge'|'rick_challenge'|'revenge'|'mission_100'|'exam'>('daily')
  const [loading, setLoading] = useState(false);
  const [targetKyu, setTargetKyu] = useState('kyu6')
  
  const [selectedInputMode, setSelectedInputMode] = useState<'quiz_kanji'|'typing_read'|'write_canvas'|'write_self'>('write_canvas')
  
  const [rickMode, setRickMode] = useState<'read'|'think'|'write'>('read')
  const [adminTargetUser, setAdminTargetUser] = useState(defaultUser)
  const [allWordsList, setAllWordsList] = useState<any[]>([]);
  const [selectedLogDate, setSelectedLogDate] = useState<string|null>(null);
  const [editStreak, setEditStreak] = useState(0);
  const [challengeSettings, setChallengeSettings] = useState({ mode: 'auto', selected_ids: [] as number[], auto_count: 5, quest_count: 5, special_quest_count: 10, challenge_quest_count: 8, reward_goal_days: 14, reward_text: '好きなおやつ', owned_rewards: 0, total_earned_rewards: 0, unlocked_tips: [] as string[] });
  const [hasParentChallenge, setHasParentChallenge] = useState(false);
  const [calendarDate, setCalendarDate] = useState(getJSTDate());
  const [dailyProgress, setDailyProgress] = useState({ id: 0, date: getTodayJST(), count: 0, is_completed: false, study_time_seconds: 0, collection_views:0, streak: 0, details: [] as any[] });
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<ProgressStats | null>(null)

  const [reviewCandidates, setReviewCandidates] = useState<KanjiWord[]>([])
  const [reviewRevealed, setReviewRevealed] = useState<number[]>([]);

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

  // --- キャンバス・自己判定用ステート ---
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [gameStep, setGameStep] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);

  const pendingTimeRef = useRef(0);
  const pendingViewsRef = useRef(0);
  const studySecondsRef = useRef(0);
  const [studySeconds, setStudySeconds] = useState(0);
  const [isStudyTimerRunning, setIsStudyTimerRunning] = useState(false);

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
      <span>
        {reading}
        <span className="text-sm text-stone-500">{okurigana}</span>
      </span>
    );
  }, []);

  const toggleReviewReveal = useCallback((id: number) => {
    setReviewRevealed((prev) => {
      if (prev.includes(id)) {
        return prev.filter(rid => rid !== id);
      }
      return [...prev, id];
    });
  }, []);

  const fetchAllWordsForEdit = useCallback(async (targetUser: any = adminTargetUser) => {
    const { data: words } = await supabase.from('kanji_questions').select('*').eq('target_user', targetUser.db_target).order('id', { ascending: false }).limit(3000);
    const { data: progress } = await supabase.from('user_progress').select('question_id, status, mistake_count').eq('user_id', targetUser.id).limit(3000);
    if (words) {
      const sMap = new Map();
      progress?.forEach((p: any) => sMap.set(p.question_id, p));
      setAllWordsList(words.map((w: any) => {
        const progressEntry = sMap.get(w.id);
        return { ...w, currentStatus: progressEntry?.status || 'learning', mistakeCount: progressEntry?.mistake_count || 0 };
      }));
    }
  }, [adminTargetUser]);

  const toggleArchiveStatus = useCallback(async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'archived' ? 'gold' : 'archived';
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: currentUser.id,
        question_id: id,
        status: newStatus,
        last_reviewed_at: new Date().toISOString()
      }, { onConflict: 'user_id, question_id' });

    if (error) {
      alert("エラーが発生しました: " + error.message);
    } else {
      alert(newStatus === 'archived' ? "アーカイブに移動しました 📦" : "図鑑に戻しました ✨");
      fetchAllWordsForEdit(currentUser); 
    }
  }, [currentUser, fetchAllWordsForEdit]);

  const checkDailyProgress = useCallback(async () => {
    const today = getTodayJST();
    const yesterday = getYesterdayJST();

    const { data: todayLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).single();
    const { data: yesterdayLog } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', yesterday).single();

    const yesterdayStreak = (yesterdayLog?.is_completed) ? (yesterdayLog.streak || 0) : 0;

    if (todayLog) {
      const currentStreak = todayLog.is_completed ? (todayLog.streak || (yesterdayStreak + 1)) : yesterdayStreak;
      setDailyProgress({ ...todayLog, streak: currentStreak });
    } else {
      setDailyProgress({ id: 0, date: today, count: 0, is_completed: false, details: [], streak: yesterdayStreak, study_time_seconds: 0, collection_views: 0 });
    }
  }, [currentUser.id]);

  const fetchMonthlyLogs = useCallback(async (targetDate: Date, userId: string = currentUser.id) => {
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const last = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', userId).gte('date', first).lte('date', last);
    if (data) setMonthlyLogs(data);
  }, [currentUser.id]);

  const fetchAdminStats = useCallback(async (targetUser: any) => {
    setLoading(true);
    await fetchMonthlyLogs(calendarDate, targetUser.id);

    const { count: totalCount } = await supabase.from('kanji_questions').select('*', { count: 'exact', head: true }).eq('target_user', targetUser.db_target);
    const { data: progress } = await supabase.from('user_progress').select('status, mistake_count, question_id, kanji_questions(kanji, reading, okurigana)').eq('user_id', targetUser.id).limit(3000);

    const ranks = { learning: 0, bronze: 0, silver: 0, gold: 0 };
    let weakList: any[] = [];
    progress?.forEach((p: any) => {
      const wd = Array.isArray(p.kanji_questions) ? p.kanji_questions[0] : p.kanji_questions;
      if (p.status === 'gold' || p.status === 'mastered') ranks.gold++; 
      else if (p.status === 'silver') ranks.silver++; 
      else if (p.status === 'bronze') ranks.bronze++;
      if (p.mistake_count > 0 && wd) weakList.push({ word: wd.kanji, meaning: getFullReading(wd.reading, wd.okurigana), mistakes: p.mistake_count });
    });
    ranks.learning = Math.max(0, (totalCount || 0) - ranks.gold - ranks.silver - ranks.bronze);
    weakList.sort((a, b) => b.mistakes - a.mistakes);

    const thirtyDaysAgo = getJSTDate(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: logD } = await supabase.from('daily_logs').select('*').eq('user_id', targetUser.id).gte('date', formatDate(thirtyDaysAgo)).order('date', { ascending: true });

    if (logD && logD.length > 0) {
      const [lastLog] = logD.slice().reverse();
      setEditStreak(lastLog?.streak || 0);
    } else {
      setEditStreak(0);
    }

    setStats({
      total: totalCount || 0,
      mastered: ranks.gold,
      ranks,
      weakWords: weakList,
      checkWords: [],
      recentLogs: logD ? logD.slice().reverse() : [],
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
  }, [calendarDate, fetchMonthlyLogs, getFullReading]);

  const sendLineToChild = useCallback(() => {
    alert("LINE送信機能は現在準備中です");
  }, []);

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

  const handleAddWord = useCallback(async (newWordData: any, isMistake: boolean) => {
    const { data: insertedWord, error } = await supabase
      .from('kanji_questions')
      .insert([{ ...newWordData, kanji_level: newWordData.category, target_user: adminTargetUser.db_target }])
      .select('id').single();

    if (error) { alert("追加に失敗しました: " + error.message); return; }

    if (isMistake && insertedWord) {
      await supabase.from('user_progress').upsert({
        user_id: adminTargetUser.id, question_id: insertedWord.id, status: 'learning', mistake_count: 1, last_reviewed_at: new Date().toISOString()
      }, { onConflict: 'user_id, question_id' });
    }
    alert('単語を追加しました！');
    fetchAllWordsForEdit();
  }, [adminTargetUser, fetchAllWordsForEdit]);

  const handleUpdateWord = useCallback(async (id: number, updatedData: any) => {
    const { error } = await supabase.from('kanji_questions').update(updatedData).eq('id', id);
    if (error) alert("更新に失敗しました: " + error.message);
    else {
      alert('単語を更新しました！');
      fetchAllWordsForEdit();
    }
  }, [fetchAllWordsForEdit]);

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

  const updateCollectionSelfJudge = useCallback(async (word: KanjiWord, remembered: boolean) => {
    const status = remembered ? 'gold' : 'learning';
    const mistakeCount = ((word as any).mistakeCount || 0) + (remembered ? 0 : 1);
    setAllWordsList((prev) => prev.map((item) => item.id === word.id ? { ...item, currentStatus: status, mistakeCount } : item));
    const { error } = await supabase.from('user_progress').upsert({
      user_id: currentUser.id,
      question_id: word.id,
      status,
      mistake_count: mistakeCount,
      last_reviewed_at: new Date().toISOString()
    }, { onConflict: 'user_id, question_id' });
    if (error) alert('判定を保存できませんでした: ' + error.message);
  }, [currentUser.id]);

  const registerCollectionMistake = useCallback(async ({ kanji, reading, note, category }: { kanji: string; reading: string; note: string; category: string }) => {
    const normalizedKanji = kanji.trim();
    const normalizedReading = reading.trim();
    if (!normalizedKanji || !normalizedReading) return false;

    const { data: existingWord, error: lookupError } = await supabase
      .from('kanji_questions')
      .select('id')
      .eq('target_user', currentUser.db_target)
      .eq('kanji', normalizedKanji)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      alert('漢字を確認できませんでした: ' + lookupError.message);
      return false;
    }

    let questionId = existingWord?.id;
    if (!questionId) {
      const { data: insertedWord, error: insertError } = await supabase
        .from('kanji_questions')
        .insert({
          target_user: currentUser.db_target,
          kanji: normalizedKanji,
          reading: normalizedReading,
          okurigana: '',
          sentence: '',
          emoji: '📝',
          category: category,
          kanji_level: category,
          usage_example: note.trim() || null,
          origin_logic: null
        })
        .select('id')
        .single();

      if (insertError || !insertedWord) {
        alert('漢字を登録できませんでした: ' + (insertError?.message || '登録内容を確認してください'));
        return false;
      }
      questionId = insertedWord.id;
    }

    const { data: existingProgress, error: progressLookupError } = await supabase
      .from('user_progress')
      .select('mistake_count')
      .eq('user_id', currentUser.id)
      .eq('question_id', questionId)
      .maybeSingle();

    if (progressLookupError) {
      alert('間違いの記録を確認できませんでした: ' + progressLookupError.message);
      return false;
    }

    const { error: progressError } = await supabase.from('user_progress').upsert({
      user_id: currentUser.id,
      question_id: questionId,
      status: 'learning',
      mistake_count: (existingProgress?.mistake_count || 0) + 1,
      last_reviewed_at: new Date().toISOString()
    }, { onConflict: 'user_id, question_id' });

    if (progressError) {
      alert('間違いを記録できませんでした: ' + progressError.message);
      return false;
    }

    await fetchAllWordsForEdit(currentUser);
    return true;
  }, [currentUser, fetchAllWordsForEdit]);

  const saveCompletedStudyTimer = useCallback(async () => {
    const today = getTodayJST();
    const { data: todayLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).single();
    const updates = {
      study_time_seconds: (todayLog?.study_time_seconds || 0) + 600,
      collection_views: todayLog?.collection_views || 0
    };
    if (todayLog) {
      await supabase.from('daily_logs').update(updates).eq('id', todayLog.id);
    } else {
      await supabase.from('daily_logs').insert([{ user_id: currentUser.id, date: today, count: 0, is_completed: false, streak: 0, ...updates }]);
    }
    setDailyProgress((prev: any) => ({ ...prev, date: today, ...updates }));
  }, [currentUser.id]);

  const startStudyTimer = useCallback(() => {
    if (studySecondsRef.current >= 600) {
      studySecondsRef.current = 0;
      setStudySeconds(0);
    }
    setIsStudyTimerRunning(true);
    if (view !== 'collection') {
      fetchAllWordsForEdit(currentUser);
      setView('collection');
    }
  }, [currentUser, fetchAllWordsForEdit, view]);

  useEffect(() => {
    if (!isStudyTimerRunning || view !== 'collection') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const nextSeconds = Math.min(studySecondsRef.current + 1, 600);
      studySecondsRef.current = nextSeconds;
      setStudySeconds(nextSeconds);
      if (nextSeconds >= 600) {
        window.clearInterval(timer);
        setIsStudyTimerRunning(false);
        void saveCompletedStudyTimer();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isStudyTimerRunning, saveCompletedStudyTimer, view]);

  const prepareQuestion = useCallback((word: KanjiWord, availableWords: KanjiWord[]) => {
    setUserAnswer(''); setMessage(''); setShowRick(false); setMistakeCount(0);
    setFeedbackMsg(null); setIsProcessing(false); setIsTransitioning(false);
    setShowHint(false); setShowFlashAnswer(false);

    setGameStep(0);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    const nextLMode = (selectedInputMode === 'typing_read') ? 'kanji_to_read' : 'read_to_kanji';
    setLangMode(nextLMode);

    const others = availableWords.filter(w => w.id !== word.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    setOptions([word, ...others].sort(() => 0.5 - Math.random()));
  }, [selectedInputMode]);

  const openChestRoom = async () => {
    setLoading(true);
    const { data: splaTips } = await supabase.from('splatoon_tips').select('content');
    const { data: mcTips } = await supabase.from('minecraft_tips').select('content');
    
    const splaList = splaTips?.map(t => `[スプラ] ${t.content}`) || [];
    const mcList = mcTips?.map(t => `[マイクラ] ${t.content}`) || [];
    const allTips = [...splaList, ...mcList];
    
    const unlocked = challengeSettings?.unlocked_tips || [];
    const unobtained = allTips.filter(t => !unlocked.includes(t));
    const pool = unobtained.length >= 2 ? unobtained : allTips;
    const shuffled = pool.sort(() => 0.5 - Math.random());
    
    setRewardTipsList(shuffled.slice(0, 2));
    setOpenedChests([]);
    setView('result_chest');
    setLoading(false);
  };

  const startGame = async (selectedMode: any) => {
    setLoading(true);
    setMode(selectedMode);
    setOpenedChests([]);
    setMistakeCount(0);

    if (selectedMode === 'mission_100' || selectedMode === 'exam') {
        setSelectedInputMode('write_canvas');
    }

    const examMission = getExamMissionPhase();
    if (selectedMode === 'mission_100' && !examMission.isActive) {
      alert(examMission.phase === 0
        ? `100日特訓は${examMission.period}です。あと${examMission.daysUntilStart}日準備しましょう！`
        : '100日特訓期間は終了しました。入試本番に向けて頑張ってください！');
      setLoading(false);
      return;
    }

    const limit = selectedMode === 'mission_100' ? 10 : selectedMode === 'weekend' ? (challengeSettings.special_quest_count || 10) : (challengeSettings.quest_count || 5);
    setCurrentGameGoal(limit);

    let query = supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target).limit(3000);
    
    if (selectedMode !== 'mission_100' && selectedMode !== 'exam' && targetKyu !== 'all' && targetKyu !== 'mistakes' && targetKyu !== 'hard') {
      query = query.eq('kanji_level', targetKyu);
    }
    const { data: allW } = await query;
    const { data: progress } = await supabase.from('user_progress').select('question_id, status, mistake_count').eq('user_id', currentUser.id).limit(3000);

    const statusMap = new Map(progress?.map(p => [p.question_id, p.status]));
    const mistakeMap = new Map(progress?.map(p => [p.question_id, p.mistake_count || 0]));

    if (!allW?.length) { 
      alert(`該当する単語が見つからないワン！🐶`);
      setLoading(false); 
      return; 
    }

    let queue;
    let availableWordsForOptions = allW;

    if (selectedMode === 'exam') {
        const activeWords = allW.filter(w => statusMap.get(w.id) !== 'archived' && (mistakeMap.get(w.id) || 0) > 0);

        if (!activeWords.length) {
            alert("間違えた漢字がまだないワン！すごい！🐶✨");
            setLoading(false);
            return;
        }

        setCachedAllWords(activeWords);
        availableWordsForOptions = activeWords;

        queue = [...activeWords].sort((a, b) => {
            const mistakesA = mistakeMap.get(a.id) || 0;
            const mistakesB = mistakeMap.get(b.id) || 0;
            if (mistakesA !== mistakesB) return mistakesB - mistakesA;
            return 0.5 - Math.random();
        }).slice(0, limit);

    } else if (selectedMode === 'mission_100') {
      const phaseWords = allW.filter((word) => examMission.categoryIds.includes(word.kanji_level));
      const missionWords = phaseWords.length > 0 ? phaseWords : allW;
      const progressMap = new Map(progress?.map((entry) => [entry.question_id, entry]));
      const statusOrder: Record<string, number> = { learning: 0, bronze: 1, silver: 2, gold: 3 };
      
      queue = [...missionWords].sort((a, b) => {
        const progressA = progressMap.get(a.id);
        const progressB = progressMap.get(b.id);
        if (examMission.phase === 3) {
          const missionPriorityA = a.kanji_level === 'mission_100' ? 0 : 1;
          const missionPriorityB = b.kanji_level === 'mission_100' ? 0 : 1;
          if (missionPriorityA !== missionPriorityB) return missionPriorityA - missionPriorityB;
        }
        const mistakesA = progressA?.mistake_count || 0;
        const mistakesB = progressB?.mistake_count || 0;
        if (examMission.phase === 3 && mistakesA !== mistakesB) return mistakesB - mistakesA;
        const rankA = statusOrder[progressA?.status || 'learning'];
        const rankB = statusOrder[progressB?.status || 'learning'];
        return rankA === rankB ? 0.5 - Math.random() : rankA - rankB;
      }).slice(0, Math.min(limit, missionWords.length));
      
      setCachedAllWords(missionWords);
      availableWordsForOptions = missionWords;

    } else {
      let activeWords = allW.filter(w => statusMap.get(w.id) !== 'archived');

      if (targetKyu === 'mistakes') {
          activeWords = activeWords.filter(w => (mistakeMap.get(w.id) || 0) > 0 || w.kanji_level === 'mistakes');
      } else if (targetKyu === 'hard') {
          activeWords = activeWords.filter(w => (mistakeMap.get(w.id) || 0) >= 2);
      }

      if (!activeWords.length) {
          alert("出題できる問題がないワン！🐶");
          setLoading(false);
          return;
      }

      setCachedAllWords(activeWords);
      availableWordsForOptions = activeWords;

      if (selectedMode === 'daily') {
        const statusOrder: Record<string, number> = { learning: 0, bronze: 1, silver: 2, gold: 3 };
        queue = [...activeWords].sort((a, b) => {
          const rankA = statusOrder[statusMap.get(a.id) || 'learning'] ?? 0;
          const rankB = statusOrder[statusMap.get(b.id) || 'learning'] ?? 0;
          if (rankA !== rankB) return rankA - rankB;
          return 0.5 - Math.random();
        }).slice(0, limit);
      } else if (selectedMode === 'parent_challenge') {
        if (challengeSettings.mode === 'manual' && challengeSettings.selected_ids?.length > 0) {
            queue = activeWords.filter(w => challengeSettings.selected_ids.includes(w.id)).slice(0, limit);
        } else {
            const { data: progData } = await supabase.from('user_progress').select('question_id, mistake_count').eq('user_id', currentUser.id).order('mistake_count', { ascending: false });
            if (progData && progData.length > 0) {
                const weakIds = progData.filter(p => p.mistake_count > 0).slice(0, challengeSettings.auto_count || 5).map(p => p.question_id);
                queue = activeWords.filter(w => weakIds.includes(w.id));
                if (queue.length < limit) {
                    const others = activeWords.filter(w => !weakIds.includes(w.id)).sort(() => 0.5 - Math.random()).slice(0, limit - queue.length);
                    queue = [...queue, ...others];
                }
            } else {
                queue = [...activeWords].sort(() => 0.5 - Math.random()).slice(0, limit);
            }
        }
      } else {
        queue = [...activeWords].sort(() => 0.5 - Math.random()).slice(0, limit);
      }
    }

    setQuestQueue(queue); 
    setCurrentIndex(0); 

    const [ firstWord ] = queue;
    if (firstWord) {
      prepareQuestion(firstWord, availableWordsForOptions);
    }
    setView('game'); 
    setLoading(false);
  };

  const updateProgress = async (id: number, correct: boolean) => {
    const today = getTodayJST();
    const { data: cLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).single();

    const [curWord] = questQueue.slice(currentIndex);
    const nEntry = { time: getJSTTimeString(), word: curWord?.kanji, mode: MODE_NAMES[mode] || '受験モード', result: correct ? 'correct' : 'incorrect' };

    const nT = (cLog?.study_time_seconds || 0) + pendingTimeRef.current;
    const nV = (cLog?.collection_views || 0) + pendingViewsRef.current;
    pendingTimeRef.current = 0; pendingViewsRef.current = 0;

    const nextCount = correct ? (cLog?.count || 0) + 1 : (cLog?.count || 0);
    const dailyGoal = challengeSettings.quest_count || 5;
    const nextCompleted = cLog?.is_completed || (nextCount >= dailyGoal);

    const lD = { 
      count: nextCount, 
      is_completed: nextCompleted, 
      details: [...(cLog?.details || []), nEntry], 
      study_time_seconds: nT, 
      collection_views: nV 
    };

    if (cLog) await supabase.from('daily_logs').update(lD).eq('id', cLog.id);
    else await supabase.from('daily_logs').insert([{ user_id: currentUser.id, date: today, streak: 0, ...lD }]);

    setDailyProgress((prev: any) => ({ ...prev, ...lD })); 

    const { data: pD } = await supabase.from('user_progress').select('status, mistake_count').eq('user_id', currentUser.id).eq('question_id', id).maybeSingle();
    let ns = pD?.status || 'learning'; 
    if (correct) { 
        if (ns === 'learning') ns = 'bronze'; 
        else if (ns === 'bronze') ns = 'silver'; 
        else if (ns === 'silver') ns = 'gold'; 
    }
    await supabase.from('user_progress').upsert({
      user_id: currentUser.id,
      question_id: id,
      status: ns,
      mistake_count: (pD?.mistake_count || 0) + (correct ? 0 : 1),
      last_reviewed_at: new Date().toISOString()
    }, { onConflict: 'user_id, question_id' });
  };

  const checkAnswer = async (ans: string, isVoice: boolean = false) => {
    if (isProcessing || showRick) return;
    setIsProcessing(true);
    const [cur] = questQueue.slice(currentIndex);
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
    setIsTransitioning(true);
    stopSpeaking();

    const nextIdx = currentIndex + 1;

    if (nextIdx >= questQueue.length) {
        playSound('clear');
        
        if (mode === 'daily') {
            const today = getTodayJST();
            const { data: cLog } = await supabase.from('daily_logs').select('streak, is_completed').eq('user_id', currentUser.id).eq('date', today).single();
            
            if (!dailyProgress.is_completed && !cLog?.is_completed) {
                const yesterday = getYesterdayJST();
                const { data: yLog } = await supabase.from('daily_logs').select('streak').eq('user_id', currentUser.id).eq('date', yesterday).single();
                const newStreak = (yLog?.streak || 0) + 1;

                await supabase.from('daily_logs').update({ is_completed: true, streak: newStreak }).eq('user_id', currentUser.id).eq('date', today);
                setDailyProgress((prev: any) => ({ ...prev, is_completed: true, streak: newStreak }));

                const goal = challengeSettings.reward_goal_days || 14;
                if (newStreak > 0 && newStreak % goal === 0) {
                    const newOwned = (challengeSettings.owned_rewards || 0) + 1;
                    const newTotal = (challengeSettings.total_earned_rewards || 0) + 1;
                    
                    await supabase.from('challenge_settings').update({ 
                        owned_rewards: newOwned,
                        total_earned_rewards: newTotal
                    }).eq('target_user_id', currentUser.id);
                    
                    setChallengeSettings((prev: any) => ({ 
                        ...prev, 
                        owned_rewards: newOwned, 
                        total_earned_rewards: newTotal 
                    }));
                }
            } else {
                await supabase.from('daily_logs').update({ is_completed: true }).eq('user_id', currentUser.id).eq('date', today);
                setDailyProgress((prev: any) => ({ ...prev, is_completed: true }));
            }
        } else {
            const today = getTodayJST();
            const { data: cLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).single();
            if (cLog) {
                const doneEntry = { time: getJSTTimeString(), word: 'ALL CLEAR', mode: MODE_NAMES[mode] || '受験モード', result: 'done' };
                await supabase.from('daily_logs').update({ details: [...(cLog.details || []), doneEntry] }).eq('id', cLog.id);
                setDailyProgress((prev: any) => ({ ...prev, details: [...(prev.details || []), doneEntry] }));
            }
        }

        setView('result');

    } else {
        setCurrentIndex(nextIdx);
        const [ nextWord ] = questQueue.slice(nextIdx);
        if (nextWord) {
            prepareQuestion(nextWord, cachedAllWords);
        }
    }
    setIsTransitioning(false);
  }, [currentIndex, questQueue, cachedAllWords, dailyProgress, mode, currentUser, prepareQuestion, stopSpeaking, selectedInputMode, playSound, challengeSettings]);

  const handleSelfJudge = async (isCorrect: boolean) => {
    if (isProcessing) return;
    setIsProcessing(true);
    const [cur] = questQueue.slice(currentIndex);

    if (isCorrect) {
        playSound('correct'); 
        confetti({ particleCount: 50 });
    } else {
        playSound('wrong'); 
        setMistakeCount(prev => prev + 1);
    }

    await updateProgress(cur.id, isCorrect);
    nextQuestion();
    setIsProcessing(false);
  };

  const startDrawing = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setLastPosition({ x, y });
  }, []);

  const draw = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !lastPosition) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#334155'; // 鉛筆らしい色
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    setLastPosition({ x, y });
  }, [isDrawing, lastPosition]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPosition(null);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const renderCalendar = useCallback(() => {
    const y = calendarDate.getFullYear();
    const m = calendarDate.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const dayCells = [];
    
    const labels = ['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
      <div key={`w-${i}`} className="text-center font-bold text-xs text-stone-400">{w}</div>
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

  useEffect(() => {
    const fetchReviewCandidates = async () => {
      let query = supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target).limit(3000);
      if (targetKyu !== 'all') {
        query = query.eq('kanji_level', targetKyu);
      }
      const { data: allWords } = await query;
      const { data: progress } = await supabase.from('user_progress').select('question_id, status').eq('user_id', currentUser.id).limit(3000);

      if (allWords) {
          const progressMap = new Map();
          progress?.forEach(p => progressMap.set(p.question_id, p.status));
          
          const candidates = allWords.filter(w => {
              const status = progressMap.get(w.id);
              return status !== 'archived' && (!status || status === 'learning');
          });
          setReviewCandidates(candidates.sort(() => 0.5 - Math.random()).slice(0, 5));
      }
    };

    if (view === 'menu') {
        fetchReviewCandidates();
    }
  }, [currentUser.db_target, currentUser.id, targetKyu, view]);

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
    if (['game', 'rick_challenge'].includes(view)) {
      interval = setInterval(() => { pendingTimeRef.current += 1; }, 1000);
    }
    return () => clearInterval(interval);
  }, [view]);

  const navTo = (v: any) => { stopSpeaking(); setShowRick(false); setView(v); };

  const studyTimerPanel = (
    <StudyTimerPanel
      elapsedSeconds={studySeconds}
      isRunning={isStudyTimerRunning}
      isStudyAreaActive={view === 'collection'}
      onStart={startStudyTimer}
      onPause={() => setIsStudyTimerRunning(false)}
    />
  );

  const withGlobalTimer = (screen: React.ReactNode) => (
    <>
      {screen}
      {studyTimerPanel}
    </>
  );

  if (view === 'menu') return withGlobalTimer(<MenuScreen {...{currentUser, setCurrentUser, dailyProgress, challengeSettings, targetKyu, setTargetKyu, selectedInputMode, setSelectedInputMode, rickMode, setRickMode, reviewCandidates, reviewRevealed, toggleReviewReveal, hasParentChallenge, startGame, setView: navTo, fetchCollection: () => { setView('collection'); fetchAllWordsForEdit(currentUser); }, renderCalendar, stopSpeaking, fetchAdminStats, setAdminTargetUser, renderReading, examMission: getExamMissionPhase(), openChestRoom}} />);

  if (view === 'admin') return withGlobalTimer(<AdminScreen {...{currentUser, setView: navTo, adminTargetUser, setAdminTargetUser, fetchAdminStats, fetchAllWordsForEdit, stats, challengeSettings, setChallengeSettings, saveChallengeSettings, sendLineToChild, editStreak, setEditStreak, handleSaveStreak, handleAddWord, handleUpdateWord, allWordsList, toggleMasterStatus, handleDeleteWord, monthlyLogs, selectedLogDate, setSelectedLogDate, renderCalendar}} />);

  if (view === 'collection') return withGlobalTimer(<CollectionScreen {...{currentUser, setView: navTo, allWordsList, challengeSettings, speakWord, renderReading, getFullReading, stopSpeaking, onViewCard: () => { pendingViewsRef.current += 1; }, onSelfJudge: updateCollectionSelfJudge, onRegisterMistake: registerCollectionMistake, toggleArchiveStatus}} />);

  if (view === 'game' || view === 'rick_challenge') return withGlobalTimer(
    <GameScreen
      {...{
        currentUser, view, mode, questQueue, currentIndex, isTransitioning,
        selectedInputMode, rickMode,
        inputMode: selectedInputMode === 'write_canvas' ? 'canvas' :
        selectedInputMode === 'write_self' ? 'self' :
        selectedInputMode === 'typing_read' ? 'typing' : 'quiz',
        langMode, gameStep, setGameStep, weekendPhase: 1, bossHp, currentGameGoal,
        isBossAttacked: false, showRick, message, showHint, showFlashAnswer, mistakeCount,
        feedbackMsg, options, userAnswer, setUserAnswer, isListening, isDrawing,
        canvasRef, startDrawing, draw, stopDrawing, clearCanvas,
        startListening: () => setIsListening(!isListening), checkAnswer,
        handleSelfJudge,
        nextQuestion, stopSpeaking, setView: navTo, renderReading, speakWord, getFullReading
      }}
    />
  );

  if (view === 'result') {
    const tS = dailyProgress.study_time_seconds || 0;
    const is10MinDone = tS >= 600;
    const isMission100Done = dailyProgress?.details?.some((d: any) => d.mode === MODE_NAMES['mission_100'] && d.result === 'done');

    return withGlobalTimer(
        <div className={`min-h-screen ${currentUser.light} flex flex-col items-center justify-center p-6 text-center font-sans transition-colors duration-1000`}>
            <div className="bg-white rounded-[3.5rem] shadow-2xl p-10 w-full max-w-sm border-4 border-stone-100">
                <h2 className="text-4xl font-black text-emerald-500 mb-6">QUEST CLEAR!</h2>
                <div className="relative w-32 h-32 mx-auto mb-8">
                    <img src="/Rick.png" alt="Rick" className="w-full h-full rounded-full shadow-lg border-4 border-white object-cover" />
                </div>
                <div className="bg-stone-50 p-6 rounded-3xl mb-8 text-left border-2 border-stone-100 space-y-3">
                    <p className="text-sm font-black text-stone-700 mb-2">🎁 今日の宝箱への道のり</p>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{is10MinDone ? '✅' : '🔲'}</span>
                        <span className={`text-xs font-bold ${is10MinDone ? 'text-emerald-600' : 'text-stone-500'}`}>1日10分のカード学習</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{isMission100Done ? '✅' : '🔲'}</span>
                        <span className={`text-xs font-bold ${isMission100Done ? 'text-emerald-600' : 'text-stone-500'}`}>合格ミッションのクリア</span>
                    </div>
                </div>
            </div>
            <button onClick={() => setView('menu')} className={`mt-8 w-full max-w-sm py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95 border-b-8 bg-stone-800 text-white`}>村へもどる 🐾</button>
        </div>
    );
  }

  if (view === 'result_chest') {
    return withGlobalTimer(
        <div className={`min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans transition-colors duration-1000`}>
            <div className="w-full max-w-lg animate-in fade-in zoom-in duration-700">
                <div className="mb-8 text-left">
                    <h2 className="text-4xl font-black text-yellow-400 mb-2">✨ 秘密の宝物庫 ✨</h2>
                    <p className="text-sky-300 font-bold text-sm tracking-widest">宝箱をタップして豆知識を手にいれよう！</p>
                </div>
                <div className="grid grid-cols-2 gap-5 mb-10">
                    {rewardTipsList.map((tip, idx) => {
                        const isOpened = openedChests.includes(idx);
                        return (
                            <div key={idx} onClick={async () => {
                                if(!isOpened) {
                                    playSound('chest'); 
                                    const nextOpened = [...openedChests, idx];
                                    setOpenedChests(nextOpened); 
                                    confetti({ particleCount: 30 });
                                    
                                    const currentTips = challengeSettings?.unlocked_tips || [];
                                    if (!currentTips.includes(tip)) {
                                        const nextTips = [...currentTips, tip];
                                        setChallengeSettings((p:any) => ({...p, unlocked_tips: nextTips}));
                                        await supabase.from('challenge_settings').update({ unlocked_tips: nextTips }).eq('target_user_id', currentUser.id);
                                    }
                                    
                                    if (nextOpened.length === 2) {
                                        const today = getTodayJST();
                                        const { data: cLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).single();
                                        if (cLog) {
                                            const doneEntry = { time: getJSTTimeString(), word: 'CHEST', mode: 'chest', result: 'done' };
                                            await supabase.from('daily_logs').update({ details: [...(cLog.details || []), doneEntry] }).eq('id', cLog.id);
                                            setDailyProgress((prev: any) => ({ ...prev, details: [...(prev.details || []), doneEntry] }));
                                        }
                                    }
                                }
                            }} className={`relative p-6 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer transform active:scale-90 ${isOpened ? 'bg-slate-900/50 border-slate-800 scale-95 shadow-inner' : 'bg-gradient-to-b from-slate-800 to-slate-900 border-yellow-500/50 shadow-lg'}`}>
                                {!isOpened && <div className="absolute inset-0 bg-yellow-400/5 rounded-[2.5rem] animate-pulse"></div>}
                                <div className={`text-6xl mb-4 ${isOpened ? 'rotate-12 scale-110' : ''}`}>{isOpened ? '🎁' : '📦'}</div>
                                <p className={`text-[11px] font-black leading-tight transition-colors ${isOpened ? 'text-sky-200' : 'text-yellow-600'}`}>
                                    {isOpened ? (tip.startsWith('[マイクラ] ') ? tip.replace('[マイクラ] ', '') : tip.replace('[スプラ] ', '')) : '開ける！'}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
            <button onClick={() => setView('menu')} className={`mt-8 w-full max-w-sm py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95 border-b-8 bg-slate-800 text-white`}>村へもどる 🐾</button>
        </div>
    );
  }

  return null;
}