// app/page.tsx
'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from "@/lib/supabaseClient";
import { USERS, CATEGORIES, MODE_NAMES } from '@/lib/constants'
import type { KanjiWord, ProgressStats } from '@/lib/constants'

import MenuScreen from '@/components/MenuScreen'
import AdminScreen from '@/components/AdminScreen'
import PracticeScreen from '@/components/PracticeScreen'
import NotebookScreen from '@/components/NotebookScreen'
import DictionaryScreen from '@/components/DictionaryScreen'
import WeakNoteScreen from '@/components/WeakNoteScreen'
import MyNoteScreen from '@/components/MyNoteScreen'
import FloatingTimer from '@/components/FloatingTimer'

const getJSTDate = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
const formatDate = (dateObj: Date) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const getTodayJST = () => formatDate(getJSTDate());
const getJSTTimeString = () => getJSTDate().toLocaleTimeString('ja-JP', { hour12: false });

export default function Home() {
  const [defaultUser] = USERS;

  const [currentUser, setCurrentUser] = useState(defaultUser)
  const [view, setView] = useState<'menu'|'game'|'notebook'|'weak_note'|'my_note'|'dictionary'|'admin'>('menu')
  const [mode, setMode] = useState<string>('v2_rank_a')
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [adminTargetUser, setAdminTargetUser] = useState(defaultUser)
  const [allWordsList, setAllWordsList] = useState<any[]>([]);
  const [selectedLogDate, setSelectedLogDate] = useState<string|null>(null);
  const [editStreak, setEditStreak] = useState(0);
  
  const [calendarDate, setCalendarDate] = useState(getJSTDate());
  const [dailyProgress, setDailyProgress] = useState({ id: 0, date: getTodayJST(), count: 0, is_completed: false, study_time_seconds: 0, streak: 0, details: [] as any[] });
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null)

  const [questQueue, setQuestQueue] = useState<KanjiWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);

  const navTo = useCallback((newView: any) => {
    if (newView === 'menu') setSelectedLogDate(null);
    setView(newView);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const speakWord = useCallback((text: string) => {
    stopSpeaking();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'ja-JP';
    window.speechSynthesis.speak(uttr);
  }, [stopSpeaking]);

  const getFullReading = useCallback((reading: string, okurigana?: string | null) => okurigana ? `${reading}${okurigana}` : reading, []);
  const renderReading = useCallback((reading: string, okurigana?: string | null) => {
    if (!okurigana) return <span>{reading}</span>;
    return <span>{reading}<span className="text-sm text-stone-700">{okurigana}</span></span>;
  }, []);

  const fetchMonthlyLogs = useCallback(async (targetDate: Date, userId: string = currentUser.id) => {
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const last = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', userId).gte('date', first).lte('date', last);
    if (data) setMonthlyLogs(data);
  }, [currentUser.id]);

  const checkDailyProgress = useCallback(async () => {
    const today = getTodayJST();
    const { data: todayLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).maybeSingle();
    if (todayLog) {
      setDailyProgress(todayLog);
    } else {
      setDailyProgress({ id: 0, date: today, count: 0, is_completed: false, details: [], streak: 0, study_time_seconds: 0 });
    }
  }, [currentUser.id]);

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

  useEffect(() => {
    const init = async () => {
      await checkDailyProgress();
      await fetchMonthlyLogs(calendarDate);
      await fetchAllWordsForEdit(currentUser);
    };
    init();
  }, [currentUser.id, calendarDate, fetchMonthlyLogs, checkDailyProgress, fetchAllWordsForEdit]);

  const toggleMyNoteStatus = async (id: number, isCurrentlyMyNote: boolean) => {
    const newStatus = isCurrentlyMyNote ? 'archived' : 'mynote';
    setAllWordsList(prev => prev.map(w => w.id === id ? { ...w, currentStatus: newStatus } : w));
    const { data: pD } = await supabase.from('user_progress').select('mistake_count').eq('user_id', currentUser.id).eq('question_id', id).maybeSingle();
    await supabase.from('user_progress').upsert({
      user_id: currentUser.id, 
      question_id: id, 
      status: newStatus,
      mistake_count: pD?.mistake_count || 0,
      last_reviewed_at: new Date().toISOString()
    }, { onConflict: 'user_id, question_id' });
  };

  const startGame = async (selectedCategoryId: string) => {
    setLoading(true);
    setMode(selectedCategoryId);
    await fetchAllWordsForEdit(currentUser);

    let activeWords = allWordsList.filter(w => w.currentStatus !== 'archived' && w.kanji_level === selectedCategoryId);

    const reviewCandidates = activeWords.filter(w => w.mistakeCount > 0 && w.currentStatus !== 'gold');
    const newCandidates = activeWords.filter(w => w.currentStatus === 'learning' || !w.currentStatus);

    const reviewQueue = reviewCandidates.sort(() => 0.5 - Math.random()).slice(0, 5).map(w => ({ ...w, taskType: 'review' }));
    const newQueue = newCandidates.sort(() => 0.5 - Math.random()).slice(0, 10 - reviewQueue.length).map(w => ({ ...w, taskType: 'new' }));
    const queue = [...reviewQueue, ...newQueue].sort(() => 0.5 - Math.random());

    if (queue.length === 0) {
      alert("このジャンルで出題できる問題がありません！保護者メニューから問題を追加するか、別のジャンルを選んでください。");
      setLoading(false);
      return;
    }

    setQuestQueue(queue);
    setCurrentIndex(0);
    navTo('game');
    setLoading(false);
  };

  const handleSelfJudge = async (isCorrect: boolean, timeSpent: number) => {
    if (isProcessing) return;
    setIsProcessing(true);
    const [cur] = questQueue.slice(currentIndex);
    const today = getTodayJST();
    const { data: cLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).maybeSingle();

    const categoryName = CATEGORIES.find(c => c.id === mode)?.name.replace('【新】', '') || 'ドリル';

    const nEntry = {
      time: getJSTTimeString(),
      word: cur.kanji,
      mode: categoryName,
      result: isCorrect ? 'correct' : 'incorrect',
      timeSpent: timeSpent,
      taskType: (cur as any).taskType || 'new'
    };

    const nT = (cLog?.study_time_seconds || 0) + timeSpent;
    const nextCount = isCorrect ? (cLog?.count || 0) + 1 : (cLog?.count || 0);
    const nextCompleted = cLog?.is_completed || (nextCount >= 10);

    const lD = {
      count: nextCount,
      is_completed: nextCompleted,
      details: [...(cLog?.details || []), nEntry],
      study_time_seconds: nT
    };

    if (cLog) {
      await supabase.from('daily_logs').update(lD).eq('id', cLog.id);
    } else {
      await supabase.from('daily_logs').insert([{ user_id: currentUser.id, date: today, streak: 0, ...lD }]);
    }
    setDailyProgress((prev: any) => ({ ...prev, date: today, ...lD }));

    let ns = cur.currentStatus || 'learning';
    if (ns !== 'mynote') {
      if (isCorrect) {
          if (ns === 'learning') ns = 'bronze';
          else if (ns === 'bronze') ns = 'silver';
          else if (ns === 'silver') ns = 'gold';
      } else {
          ns = 'learning';
      }
    }
    const newMistakeCount = (cur.mistakeCount || 0) + (isCorrect ? 0 : 1);
    
    await supabase.from('user_progress').upsert({
      user_id: currentUser.id, question_id: cur.id, status: ns,
      mistake_count: newMistakeCount,
      last_reviewed_at: new Date().toISOString()
    }, { onConflict: 'user_id, question_id' });

    setAllWordsList(prev => prev.map(w => w.id === cur.id ? { ...w, currentStatus: ns, mistakeCount: newMistakeCount } : w));

    stopSpeaking();
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questQueue.length) {
        await fetchMonthlyLogs(calendarDate, currentUser.id);
        navTo('notebook'); 
    } else {
        setCurrentIndex(nextIdx);
    }
    setIsProcessing(false);
  };

  const handleWordViewed = async (word: any, timeSpent: number, modeName: string) => {
    if (timeSpent <= 0) return;
    const today = getTodayJST();
    const { data: cLog } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).maybeSingle();

    const nEntry = { time: getJSTTimeString(), word: word.kanji, mode: modeName, result: 'done', timeSpent: timeSpent, taskType: 'review' };
    const nT = (cLog?.study_time_seconds || 0) + timeSpent;
    const lD = { details: [...(cLog?.details || []), nEntry], study_time_seconds: nT };

    if (cLog) {
      await supabase.from('daily_logs').update(lD).eq('id', cLog.id);
    } else {
      await supabase.from('daily_logs').insert([{ user_id: currentUser.id, date: today, count: 0, is_completed: false, streak: 0, ...lD }]);
    }
    setDailyProgress((prev: any) => ({ ...prev, date: today, ...lD }));
  };

  const startDrawing = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    setIsDrawing(true);
    setLastPosition({ x, y });
  }, []);

  const draw = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !lastPosition || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.stroke();
    setLastPosition({ x, y });
  }, [isDrawing, lastPosition]);

  const stopDrawing = useCallback(() => { setIsDrawing(false); setLastPosition(null); }, []);
  const clearCanvas = useCallback(() => {
    if (canvasRef.current) canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, []);

  const fetchAdminStats = useCallback(async (targetUser: any) => {
    setLoading(true);
    await fetchMonthlyLogs(calendarDate, targetUser.id);
    const { count: totalCount } = await supabase.from('kanji_questions').select('*', { count: 'exact', head: true }).eq('target_user', targetUser.db_target);
    const { data: progress } = await supabase.from('user_progress').select('status, mistake_count, question_id, kanji_questions(kanji, reading, okurigana)').eq('user_id', targetUser.id).limit(3000);
    
    const ranks = { learning: 0, bronze: 0, silver: 0, gold: 0 };
    let weakList: any[] = [];
    progress?.forEach((p: any) => {
      const wd = Array.isArray(p.kanji_questions) ? p.kanji_questions[0] : p.kanji_questions;
      if (p.status === 'gold' || p.status === 'mastered') ranks.gold++; else if (p.status === 'silver') ranks.silver++; else if (p.status === 'bronze') ranks.bronze++;
      if (p.mistake_count > 0 && wd) weakList.push({ word: wd.kanji, meaning: getFullReading(wd.reading, wd.okurigana), mistakes: p.mistake_count });
    });
    ranks.learning = Math.max(0, (totalCount || 0) - ranks.gold - ranks.silver - ranks.bronze);
    
    const thirtyDaysAgo = getJSTDate(); 
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
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
      weakWords: weakList.sort((a, b) => b.mistakes - a.mistakes), 
      checkWords: [], 
      recentLogs: logD ? logD.slice().reverse() : [], 
      graphData: logD?.map(l => ({ date: l.date.slice(5).replace('-', '/'), count: l.count || 0 })) || [], 
      pieData: [{ name: '未習得', value: ranks.learning }, { name: 'ブロンズ', value: ranks.bronze }, { name: 'シルバー', value: ranks.silver }, { name: 'ゴールド', value: ranks.gold }]
    });
    
    setLoading(false);
  }, [calendarDate, fetchMonthlyLogs, getFullReading]);

  // ★変更：カレンダーの日付を押した時の動きを修正（保護者メニューにいる時は画面移動しない）
  const renderCalendar = useCallback(() => {
    const y = calendarDate.getFullYear(); const m = calendarDate.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate(); const firstDay = new Date(y, m, 1).getDay();
    const dayCells = [];
    for (let i = 0; i < firstDay; i++) dayCells.push(<div key={`e-${i}`} className="h-9 w-9"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const log = monthlyLogs.find(l => l.date === dateStr);
        const isToday = dateStr === getTodayJST();
        
        const handleDateClick = () => {
          setSelectedLogDate(dateStr);
          if (view !== 'admin') {
            navTo('notebook');
          }
        };

        dayCells.push(
            <div key={d} onClick={handleDateClick} className={`h-9 w-9 flex items-center justify-center rounded-full text-xs font-bold cursor-pointer relative transition-all active:scale-95 ${isToday ? 'bg-stone-800 text-white' : 'bg-white shadow-sm text-stone-600 hover:bg-stone-100 border border-stone-200'}`}>
                <span>{d}</span>
                {log?.is_completed && <span className="absolute -top-1 -right-1 text-emerald-500 text-[10px] bg-white rounded-full leading-none shadow-sm">💮</span>}
            </div>
        );
    }
    return (
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <button onClick={() => setCalendarDate(new Date(y, m - 1, 1))} className="text-stone-400 font-bold p-1">←</button>
                <h3 className="font-black text-stone-600 text-sm">{y}年 {m + 1}月</h3>
                <button onClick={() => setCalendarDate(new Date(y, m + 1, 1))} className="text-stone-400 font-bold p-1">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => <div key={`w-${i}`} className="text-center font-bold text-xs text-stone-400 mb-1">{w}</div>)}
              {dayCells}
            </div>
        </div>
    );
  }, [calendarDate, monthlyLogs, navTo, view]);

  if (view === 'menu') return <MenuScreen {...{currentUser, setCurrentUser, dailyProgress, startGame, setView: navTo, renderCalendar, stopSpeaking, fetchAdminStats, setAdminTargetUser}} />;
  if (view === 'game') return (
    <div className="relative h-screen flex flex-col font-sans">
      <FloatingTimer />
      <PracticeScreen {...{currentUser, questQueue, currentIndex, canvasRef, startDrawing, draw, stopDrawing, clearCanvas, handleSelfJudge, renderReading, speakWord, getFullReading, setView: navTo}} />
    </div>
  );
  
  if (view === 'notebook') {
    const isToday = !selectedLogDate || selectedLogDate === getTodayJST();
    const targetLog = isToday ? dailyProgress : (monthlyLogs.find(l => l.date === selectedLogDate) || { details: [], study_time_seconds: 0 });
    const displayDate = isToday ? '今日' : selectedLogDate.replace(/-/g, '/');
    return <NotebookScreen {...{currentUser, logData: targetLog, displayDate, setView: navTo}} />;
  }

  if (view === 'dictionary') return <DictionaryScreen {...{currentUser, allWordsList, setView: navTo, toggleMyNoteStatus, renderReading, speakWord, getFullReading, onWordViewed: (w:any, t:number) => handleWordViewed(w, t, '漢字辞書')}} />;
  if (view === 'weak_note') return <WeakNoteScreen {...{currentUser, allWordsList, setView: navTo, toggleMyNoteStatus, renderReading, speakWord, getFullReading, onWordViewed: (w:any, t:number) => handleWordViewed(w, t, '苦手ノート')}} />;
  if (view === 'my_note') return <MyNoteScreen {...{currentUser, allWordsList, setView: navTo, toggleMyNoteStatus, renderReading, speakWord, getFullReading, onWordViewed: (w:any, t:number) => handleWordViewed(w, t, '自分ノート')}} />;
  
  if (view === 'admin') return <AdminScreen {...{currentUser, setView: navTo, adminTargetUser, setAdminTargetUser, fetchAdminStats, fetchAllWordsForEdit, stats, challengeSettings: {} as any, setChallengeSettings: ()=>{}, saveChallengeSettings: () => {}, sendLineToChild: () => {}, editStreak, setEditStreak, handleSaveStreak: () => {}, handleAddWord: () => {}, handleUpdateWord: () => {}, allWordsList, toggleMasterStatus: () => {}, handleDeleteWord: () => {}, monthlyLogs, selectedLogDate, setSelectedLogDate, renderCalendar}} />;

  return null;
}