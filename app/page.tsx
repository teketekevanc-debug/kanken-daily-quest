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
  const [dailyProgress, setDailyProgress] = useState<any>({ id: 0, date: getTodayJST(), count: 0, is_completed: false, study_time_seconds: 0, collection_views: 0, streak: 0 })
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]); 
  const [stats, setStats] = useState<ProgressStats | null>(null)
  
  // Rickの挑戦状（復習カード）用ステート
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

  const toggleReviewReveal = useCallback((id: number) => {
    setReviewRevealed((prev) => {
        if (prev.includes(id)) {
            return prev.filter(rid => rid !== id);
        }
        return [...prev, id];
    });
  }, []);

  // --- データ取得ロジック ---
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
    // ★修正: 上限に引っかからないように.limit(3000)を追加
    const { data: progress } = await supabase.from('user_progress').select('status, mistake_count, question_id, kanji_questions(kanji, reading, okurigana)').eq('user_id', targetUser.id).limit(3000);
    
    const ranks = { learning: 0, bronze: 0, silver: 0, gold: 0 };
    let weakList: any[] = [];
    progress?.forEach((p: any) => {
        const [ ...[wd] ] = [p.kanji_questions];
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

  const fetchAllWordsForEdit = useCallback(async () => {
    // ★修正: 1000件上限突破のため.limit(3000)を追加
    const { data: words } = await supabase.from('kanji_questions').select('*').eq('target_user', adminTargetUser.db_target).order('id', { ascending: false }).limit(3000);
    const { data: progress } = await supabase.from('user_progress').select('question_id, status').eq('user_id', adminTargetUser.id).limit(3000);
    if (words) {
        const sMap = new Map();
        progress?.forEach((p: any) => sMap.set(p.question_id, p.status));
        setAllWordsList(words.map((w: any) => ({ ...w, currentStatus: sMap.get(w.id) || 'learning' })));
    }
  }, [adminTargetUser.db_target, adminTargetUser.id]);

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
    
    // 手書き・自己判定用のステートとキャンバスをリセット
    setGameStep(0);
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    const nextLMode = (selectedInputMode === 'typing_read') ? 'kanji_to_read' : 'read_to_kanji';
    setLangMode(nextLMode);
    
    const others = allWords.filter(w => w.id !== word.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    setOptions([word, ...others].sort(() => 0.5 - Math.random()));
  }, [selectedInputMode]);

  const startGame = async (selectedMode: any) => {
    setLoading(true); 
    setMode(selectedMode); 
    setOpenedChests([]); 
    setMistakeCount(0);

    const limit = selectedMode === 'weekend' ? (challengeSettings.special_quest_count || 10) : (challengeSettings.quest_count || 5);
    setCurrentGameGoal(limit);
    
    // ★修正: 上限に引っかからないように.limit(3000)を追加
    let query = supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target).limit(3000);
    if (targetKyu !== 'all') {
      query = query.eq('kanji_level', targetKyu);
    }
    const { data: allW } = await query;
    const { data: progress } = await supabase.from('user_progress').select('question_id, status').eq('user_id', currentUser.id).limit(3000);

    if (!allW?.length) { 
        alert(`選んだ級（${targetKyu}）の単語がまだないワン！🐶`);
        setLoading(false); 
        return; 
    }
    
    setCachedAllWords(allW);

    let queue;
    if (selectedMode === 'daily') {
      const statusMap = new Map(progress?.map(p => [p.question_id, p.status]));
      // ★修正: 未学習(learning)が最初(0)に選ばれるよう優先順位を是正
      const statusOrder: Record<string, number> = { learning: 0, bronze: 1, silver: 2, gold: 3 };

      queue = [...allW].sort((a, b) => {
        const rankA = statusOrder[statusMap.get(a.id) || 'learning'];
        const rankB = statusOrder[statusMap.get(b.id) || 'learning'];
        if (rankA !== rankB) return rankA - rankB;
        return 0.5 - Math.random();
      }).slice(0, limit);
    } else if (selectedMode === 'parent_challenge') {
      if (challengeSettings.mode === 'manual' && challengeSettings.selected_ids?.length > 0) {
          queue = allW.filter(w => challengeSettings.selected_ids.includes(w.id)).slice(0, limit);
      } else {
          const { data: progData } = await supabase.from('user_progress').select('question_id, mistake_count').eq('user_id', currentUser.id).order('mistake_count', { ascending: false });
          if (progData && progData.length > 0) {
              const weakIds = progData.filter(p => p.mistake_count > 0).slice(0, challengeSettings.auto_count || 5).map(p => p.question_id);
              queue = allW.filter(w => weakIds.includes(w.id));
              if (queue.length < limit) {
                  const others = allW.filter(w => !weakIds.includes(w.id)).sort(() => 0.5 - Math.random()).slice(0, limit - queue.length);
                  queue = [...queue, ...others];
              }
          } else {
              queue = [...allW].sort(() => 0.5 - Math.random()).slice(0, limit);
          }
      }
    } else {
      queue = [...allW].sort(() => 0.5 - Math.random()).slice(0, limit);
    }

    setQuestQueue(queue); 
    setCurrentIndex(0); 
    
    const [ firstWord ] = queue;
    if (firstWord) {
      prepareQuestion(firstWord, allW);
    }
    setView('game'); 
    setLoading(false);
  };

  const updateProgress = async (id: number, correct: boolean) => {
    const today = getTodayJST();
    const { data: cLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).single();
    
    const [curWord] = questQueue.slice(currentIndex);
    const nEntry = { time: getJSTTimeString(), word: curWord?.kanji, mode: MODE_NAMES[mode], result: correct ? 'correct' : 'incorrect' };
    
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
                const doneEntry = { time: getJSTTimeString(), word: 'ALL CLEAR', mode: MODE_NAMES[mode] || mode, result: 'done' };
                await supabase.from('daily_logs').update({ details: [...(cLog.details || []), doneEntry] }).eq('id', cLog.id);
                setDailyProgress((prev: any) => ({ ...prev, details: [...(prev.details || []), doneEntry] }));
            }
        }

        const tSec = dailyProgress.study_time_seconds || 0;
        const isWritingMode = ['write_canvas', 'write_self'].includes(selectedInputMode);
        const threshold = isWritingMode ? 300 : 600; 
        
        let cCount = tSec >= threshold ? (1 + Math.floor((tSec - threshold) / 300)) : 0;
        if (isWritingMode) {
          cCount *= 2;
        }
        
        const { data: tips } = await supabase.from(currentUser.defaultTipTable).select('content');
        const allTips = tips?.map(t => t.content) || [];
        const shuffledTips = allTips.slice().sort(() => 0.5 - Math.random());
        
        setRewardTipsList(shuffledTips.slice(0, Math.min(10, cCount)));
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

  // --- 自己判定ハンドラー ---
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

  // --- キャンバス描画ハンドラー ---
  const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // 表示サイズと内部解像度の比率を計算して座標を補正
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDrawing(true);
    setLastPosition({ x, y });
  }, []);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosition) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // 表示サイズと内部解像度の比率を計算して座標を補正
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#334155'; // 鉛筆らしい色（stone-700）
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

  // --- カレンダー描画 ---
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

  // Rickからの挑戦状（級と未習得状態に基づく抽出）
  useEffect(() => {
    const fetchReviewCandidates = async () => {
      // ★修正: 上限に引っかからないように.limit(3000)を追加
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
              return !status || status === 'learning';
          });
          setReviewCandidates(candidates.sort(() => 0.5 - Math.random()).slice(0, 5));
      }
    };

    if (view === 'menu') {
        fetchReviewCandidates();
    }
  }, [currentUser.db_target, currentUser.id, targetKyu, view]);

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
  if (view === 'menu') return <MenuScreen {...{currentUser, setCurrentUser, dailyProgress, challengeSettings, targetKyu, setTargetKyu, selectedInputMode, setSelectedInputMode, rickMode, setRickMode, reviewCandidates, reviewRevealed, toggleReviewReveal, hasParentChallenge, startGame, setView: navTo, fetchCollection: () => { setView('collection'); fetchAllWordsForEdit(); }, renderCalendar, stopSpeaking, fetchAdminStats, setAdminTargetUser, renderReading}} />;
  
  if (view === 'admin') return <AdminScreen {...{currentUser, setView: navTo, adminTargetUser, setAdminTargetUser, fetchAdminStats, fetchAllWordsForEdit, stats, challengeSettings, setChallengeSettings, saveChallengeSettings, sendLineToChild, editStreak, setEditStreak, handleSaveStreak, handleAddWord, allWordsList, toggleMasterStatus, handleDeleteWord, monthlyLogs, selectedLogDate, setSelectedLogDate, renderCalendar}} />;
  
  if (view === 'collection') return <CollectionScreen {...{currentUser, setView: navTo, allWordsList, challengeSettings, speakWord, renderReading, getFullReading, stopSpeaking, onViewCard: () => { pendingViewsRef.current += 1; }}} />;
  
  if (view === 'game' || view === 'rick_challenge') return (
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
    const isRRoom = rewardTipsList.length > 0;
    const tS = dailyProgress.study_time_seconds || 0;
    const isWritingMode = ['write_canvas', 'write_self'].includes(selectedInputMode);
    const threshold = isWritingMode ? 300 : 600;
    const progP = Math.min(100, (tS / threshold) * 100);
    const remainingMin = Math.ceil(Math.max(0, threshold - tS) / 60);

    return (
        <div className={`min-h-screen ${isRRoom ? 'bg-slate-950' : currentUser.light} flex flex-col items-center justify-center p-6 text-center font-sans transition-colors duration-1000`}>
            {isRRoom ? (
                <div className="w-full max-w-lg animate-in fade-in zoom-in duration-700">
                    <div className="mb-8 text-left">
                        <h2 className="text-4xl font-black text-yellow-400 mb-2">✨ 秘密の宝物庫 ✨</h2>
                        <p className="text-sky-300 font-bold text-sm tracking-widest">宝箱をタップして豆知識を手にいれよう！</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-10">
                        {rewardTipsList.map((tip, idx) => {
                            const isOpened = openedChests.includes(idx);
                            return (
                                <div key={idx} onClick={async () => {
                                    if(!isOpened) {
                                        playSound('chest'); setOpenedChests([...openedChests, idx]); confetti({ particleCount: 30 });
                                        const currentTips = challengeSettings?.unlocked_tips || [];
                                        if (!currentTips.includes(tip)) {
                                            const nextTips = [...currentTips, tip];
                                            setChallengeSettings((p:any) => ({...p, unlocked_tips: nextTips}));
                                            await supabase.from('challenge_settings').update({ unlocked_tips: nextTips }).eq('target_user_id', currentUser.id);
                                        }
                                    }
                                }} className={`relative p-5 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer transform active:scale-90 ${isOpened ? 'bg-slate-900/50 border-slate-800 scale-95 shadow-inner' : 'bg-gradient-to-b from-slate-800 to-slate-900 border-yellow-500/50 shadow-lg'}`}>
                                    {!isOpened && <div className="absolute inset-0 bg-yellow-400/5 rounded-[2.5rem] animate-pulse"></div>}
                                    <div className={`text-6xl mb-3 ${isOpened ? 'rotate-12 scale-110' : ''}`}>{isOpened ? '🎁' : '📦'}</div>
                                    <p className={`text-[11px] font-black transition-colors ${isOpened ? 'text-sky-200' : 'text-yellow-600'}`}>{isOpened ? tip : '開ける！'}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[3.5rem] shadow-2xl p-10 w-full max-w-sm border-4 border-stone-100">
                    <h2 className="text-4xl font-black text-emerald-500 mb-6">QUEST CLEAR!</h2>
                    <div className="relative w-32 h-32 mx-auto mb-8">
                        <img src="/Rick.png" alt="Rick" className="w-full h-full rounded-full shadow-lg border-4 border-white object-cover" />
                    </div>
                    <div className="bg-stone-50 p-6 rounded-3xl mb-8 text-left border-2 border-stone-100">
                        <p className="text-sm font-black text-stone-700 leading-tight mb-4">あと <span className="text-2xl text-orange-500 mx-0.5">{remainingMin}</span> 分 の学習で<br/>お宝へのトビラが開くワン！🐾</p>
                        <div className="w-full bg-stone-200 rounded-full h-4 shadow-inner p-1"><div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all" style={{ width: `${progP}%` }}></div></div>
                    </div>
                </div>
            )}
            <button onClick={() => setView('menu')} className={`mt-8 w-full max-w-sm py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95 border-b-8 ${isRRoom ? 'bg-slate-800 text-white' : 'bg-stone-800 text-white'}`}>村へもどる 🐾</button>
        </div>
    );
  }
  return null;
}