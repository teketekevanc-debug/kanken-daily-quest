'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import confetti from 'canvas-confetti'
import { USERS, CATEGORIES, MODE_NAMES, getUserFirstName } from '@/lib/constants'
import type { KanjiWord, ActivityLog, DailyLog, ProgressStats, ChallengeSettings } from '@/lib/constants'

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
    const d = getJSTDate();
    d.setDate(d.getDate() - 1);
    return formatDate(d);
};
const getJSTTimeString = () => getJSTDate().toLocaleTimeString('ja-JP', { hour12: false });

export default function Home() {
  // ★ ルール適用：配列からの安全な取得
  const [defaultUser] = USERS;
  
  // --- ステート管理 ---
  const [currentUser, setCurrentUser] = useState(defaultUser)
  const [view, setView] = useState<'menu'|'game'|'rick_challenge'|'result'|'admin'|'collection'>('menu')
  const [mode, setMode] = useState<'daily'|'free'|'weekend'|'parent_challenge'|'rick_challenge'|'revenge'>('daily')
  const [loading, setLoading] = useState(false); 
  
  // 学習・ゲーム設定
  const [targetKyu, setTargetKyu] = useState<string>('all')
  const [selectedInputMode, setSelectedInputMode] = useState<'quiz_kanji'|'typing_read'|'write_canvas'|'write_self'>('quiz_kanji')
  const [rickMode, setRickMode] = useState<'read'|'think'|'write'>('read')
  const [flashcardMode, setFlashcardMode] = useState<'normal'|'hide_kanji'|'hide_reading'>('normal')
  const [collectionTab, setCollectionTab] = useState('kyu5'); // 小6相当の5級をデフォルトに
  const [revealedCards, setRevealedCards] = useState<number[]>([]); 
  const [reviewRevealed, setReviewRevealed] = useState<number[]>([])
  
  // 管理・データ
  const [adminTargetUser, setAdminTargetUser] = useState(defaultUser)
  const [allWordsList, setAllWordsList] = useState<any[]>([]); 
  const [selectedLogDate, setSelectedLogDate] = useState<string|null>(null); 
  const [editStreak, setEditStreak] = useState(0)
  const [challengeSettings, setChallengeSettings] = useState<ChallengeSettings>({ mode: 'auto', selected_ids: [], auto_count: 5, quest_count: 5, special_quest_count: 10, challenge_quest_count: 8, reward_goal_days: 14, reward_text: '好きなおやつ' })
  const [hasParentChallenge, setHasParentChallenge] = useState(false); 
  const [calendarDate, setCalendarDate] = useState<Date>(getJSTDate())
  const [dailyProgress, setDailyProgress] = useState<DailyLog>({ id: 0, date: getTodayJST(), count: 0, is_completed: false })
  const [monthlyLogs, setMonthlyLogs] = useState<DailyLog[]>([]); 
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [reviewCandidates, setReviewCandidates] = useState<KanjiWord[]>([])
  
  // ゲーム進行
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
  const [rewardTip, setRewardTip] = useState<string|null>(null); 
  const [feedbackMsg, setFeedbackMsg] = useState<React.ReactNode | null>(null)
  const [showHint, setShowHint] = useState(false); 
  const [showFlashAnswer, setShowFlashAnswer] = useState(false); 
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false); 
  const [childCommentInput, setChildCommentInput] = useState(''); 
  const [langMode, setLangMode] = useState<'kanji_to_read'|'read_to_kanji'>('read_to_kanji')
  const [inputMode, setInputMode] = useState<'quiz'|'typing'|'canvas'|'self'>('quiz'); 
  const [options, setOptions] = useState<KanjiWord[]>([])
  const [isListening, setIsListening] = useState(false)

  // キャンバス用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // --- 共通レンダリング関数 ---
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

  // --- キャンバスロジック ---
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
      setIsDrawing(true); 
      const { offsetX, offsetY } = e.nativeEvent; 
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) { ctx.beginPath(); ctx.moveTo(offsetX, offsetY); }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return; 
      const { offsetX, offsetY } = e.nativeEvent; 
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) { ctx.lineTo(offsetX, offsetY); ctx.stroke(); }
  };
  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
      setIsDrawing(false); 
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.closePath();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };
  const clearCanvas = () => {
      const canvas = canvasRef.current; 
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // --- 音声・通知ロジック ---
  const playSound = (type: 'correct'|'wrong'|'clear') => { const audio = new Audio(`/sounds/${type}.mp3`); audio.volume = 0.5; audio.play().catch(e=>console.log(e)); }
  const stopSpeaking = () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); };
  const speakWord = (text: string) => { stopSpeaking(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP'; speechSynthesis.speak(u); }
  
  const toggleReviewReveal = (id: number) => { 
    if (reviewRevealed.includes(id)) setReviewRevealed(reviewRevealed.filter(rid => rid !== id)); 
    else setReviewRevealed([...reviewRevealed, id]) 
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("お使いのブラウザはマイク入力に対応していません🐶💦"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP'; recognition.interimResults = true; recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    // ★ 分割代入ルール適用
    recognition.onresult = (event: any) => { 
      let finalTranscript = ''; let interimTranscript = '';
      const resultsArr = Array.from(event.results);
      resultsArr.forEach((res: any) => {
        const altArray = Array.from(res);
        const [alt] = altArray;
        if (res.isFinal) finalTranscript += alt.transcript;
        else interimTranscript += alt.transcript;
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
    const { data } = await supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).single()
    if (data) setDailyProgress(data);
    else setDailyProgress({ id: 0, date: today, count: 0, is_completed: false, details: [], streak: 0 })
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
          if (p.status === 'mastered' || p.status === 'gold') ranks.gold++;
          else if (p.status === 'silver') ranks.silver++; 
          else if (p.status === 'bronze') ranks.bronze++; 
          else ranks.learning++;
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
      
      const pieData = [
        { name: `未習得 (${ranks.learning})`, value: ranks.learning }, 
        { name: `ブロンズ (${ranks.bronze})`, value: ranks.bronze }, 
        { name: `シルバー (${ranks.silver})`, value: ranks.silver }, 
        { name: `ゴールド (${ranks.gold})`, value: ranks.gold }
      ]
      
      // ★ 分割代入ルール適用
      const reversedLogs = logData ? [...logData].reverse() : [];
      const [latestLog] = reversedLogs;
      setEditStreak(latestLog ? (latestLog.streak || 0) : 0);
      
      setStats({ total: total || 0, mastered: ranks.gold, ranks, weakWords: weakWordsList, checkWords: [], recentLogs: reversedLogs, graphData, pieData })
      
      const { data: challenge } = await supabase.from('challenge_settings').select('*').eq('target_user_id', targetUser.id).single()
      if (challenge) setChallengeSettings(challenge);
      
      setLoading(false); setView('admin')
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

  // ★★★ 初期化（useEffect）を関数定義の下に移動しました ★★★
  useEffect(() => {
    checkDailyProgress(); fetchMonthlyLogs(calendarDate); fetchReviewCandidates(); checkChallengeStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, view, calendarDate])

  // --- ゲーム進行ロジック ---
  const startGame = async (selectedMode: 'daily' | 'free' | 'weekend' | 'parent_challenge' | 'rick_challenge' | 'revenge') => {
      const today = getTodayJST();
      if (dailyProgress.date !== today) setDailyProgress({ id: 0, date: today, count: 0, is_completed: false, details: [] });
      setLoading(true); setMode(selectedMode); setRewardTip(null); setMistakeCount(0); setMessage(''); setShowRick(false); setIsProcessing(false); setIsTransitioning(false); setFeedbackMsg(null);
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
      // ★ 分割代入ルール適用
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
      // ★ 分割代入ルール適用
      const [cur] = questQueue.slice(currentIndex, currentIndex + 1);
      
      if (isCorrect) { playSound('correct'); confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } 
      else { playSound('wrong'); }
      
      await updateProgress(cur.id, isCorrect);
      setTimeout(() => { setIsProcessing(false); nextQuestion(); }, 500);
  }

  const checkAnswer = async (ans: string, isVoice: boolean = false) => {
      if (isProcessing || showRick) return;
      setIsProcessing(true);
      // ★ 分割代入ルール適用
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
      const newCount = correct ? dailyProgress.count + 1 : dailyProgress.count;
      const comp = newCount >= currentGameGoal;
      const logData = { count: newCount, is_completed: comp };
      if (dailyProgress.id !== 0) await supabase.from('daily_logs').update(logData).eq('id', dailyProgress.id);
      setDailyProgress(prev => ({ ...prev, ...logData })); 
  }

  const nextQuestion = async () => {
      setIsTransitioning(true); stopSpeaking(); 
      setTimeout(async () => {
          const next = currentIndex + 1
          setGameStep(0);
          if (next >= questQueue.length) {
              if (mode === 'daily' || mode === 'weekend' || view === 'rick_challenge') {
                  playSound('clear'); setView('result'); confetti({ particleCount: 300 });
                  if(mode === 'daily') setRewardTip("毎日の冒険クリア！えらい！");
                  else setRewardTip("特訓クリア！次もがんばろう！");
              } else { startGame('free'); }
          } else {
              setCurrentIndex(next); 
              const { data: all } = await supabase.from('kanji_questions').select('*').eq('target_user', currentUser.db_target); 
              prepareQuestion(questQueue[next], all || [])
          }
          setIsTransitioning(false);
      }, 500);
  }

  // --- カレンダー描画関数 ---
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

  // --- 管理者・設定保存関連ダミー関数 ---
  const saveChallengeSettings = async (settings: any) => { alert('設定を保存しました！'); }
  const handleSaveStreak = async () => { alert(`連続日数を ${editStreak}日 に修正しました！`); }
  const handleAddWord = async (word: any) => { alert(`追加しました: ${word.kanji}`); }
  const toggleMasterStatus = async (id: number, status: string) => { alert('状態を変更しました'); }
  const handleDeleteWord = async (id: number) => { alert('削除しました'); }


  // ==========================================
  // ビューの振り分けレンダリング
  // ==========================================

  if (view === 'menu') {
    return (
      <MenuScreen 
        currentUser={currentUser} setCurrentUser={setCurrentUser} dailyProgress={dailyProgress} challengeSettings={challengeSettings}
        targetKyu={targetKyu} setTargetKyu={setTargetKyu} selectedInputMode={selectedInputMode} setSelectedInputMode={setSelectedInputMode}
        rickMode={rickMode} setRickMode={setRickMode} reviewCandidates={reviewCandidates} reviewRevealed={reviewRevealed} toggleReviewReveal={toggleReviewReveal}
        hasParentChallenge={hasParentChallenge} startGame={startGame} setView={setView} fetchCollection={fetchCollection} renderCalendar={renderCalendar}
        stopSpeaking={stopSpeaking} fetchAdminStats={fetchAdminStats} setAdminTargetUser={setAdminTargetUser} renderReading={renderReading}
      />
    );
  }

  if (view === 'admin') {
    return (
      <AdminScreen 
        currentUser={currentUser} setView={setView} adminTargetUser={adminTargetUser} setAdminTargetUser={setAdminTargetUser}
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
        checkAnswer={checkAnswer} handleSelfJudge={handleSelfJudge} nextQuestion={nextQuestion} stopSpeaking={stopSpeaking} setView={setView}
        renderReading={renderReading} speakWord={speakWord} getFullReading={getFullReading}
      />
    );
  }

  // 図鑑画面（インライン）
if (view === 'collection') {
    return (
      <CollectionScreen 
         currentUser={currentUser} setView={setView} allWordsList={allWordsList}
         speakWord={speakWord} renderReading={renderReading} getFullReading={getFullReading}
         stopSpeaking={stopSpeaking}
      />
    );
  }
  // リザルト画面（インライン）
  if (view === 'result') {
    return (
      <div className={`min-h-screen ${currentUser.light} flex flex-col items-center justify-center p-6`}>
        <div className="bg-white rounded-[3rem] shadow-2xl p-8 w-full max-w-sm text-center border-4 border-orange-200">
          <h2 className="text-4xl font-black text-orange-500 mb-4 animate-bounce">CLEAR!</h2>
          <img src="/Rick.png" alt="Rick" className="w-32 h-32 mx-auto rounded-full border-4 border-orange-400 mb-4 shadow-lg object-cover" />
          <div className="bg-orange-50 p-4 rounded-2xl mb-6 text-left border-2 border-orange-100">
            <p className="text-xs font-black text-orange-600 mb-1">🎁 Rickからのメッセージ</p>
            <p className="text-sm font-bold text-stone-700 whitespace-pre-wrap">{rewardTip || "よく頑張ったワン！"}</p>
          </div>
          <button onClick={() => setView('menu')} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition">メニューにもどる 🐾</button>
        </div>
      </div>
    );
  }

  return null;
}