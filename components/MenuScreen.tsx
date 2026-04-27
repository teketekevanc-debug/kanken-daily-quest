'use client'
import React from 'react'
import { USERS, CATEGORIES, MODE_NAMES, getUserFirstName, getDailyMessage } from '@/lib/constants'

// Homeコンポーネントから受け取るデータと関数の「型」を定義します
type MenuScreenProps = {
  currentUser: any;
  setCurrentUser: (user: any) => void;
  dailyProgress: any;
  challengeSettings: any;
  targetKyu: string;
  setTargetKyu: (kyu: string) => void;
  selectedInputMode: string;
  setSelectedInputMode: (mode: any) => void;
  rickMode: string;
  setRickMode: (mode: any) => void;
  reviewCandidates: any[];
  reviewRevealed: number[];
  toggleReviewReveal: (id: number) => void;
  hasParentChallenge: boolean;
  startGame: (mode: string) => void;
  setView: (view: any) => void;
  fetchCollection: () => void;
  renderCalendar: () => React.ReactNode;
  stopSpeaking: () => void;
  fetchAdminStats: (user: any) => void;
  setAdminTargetUser: (user: any) => void;
  renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
}

export default function MenuScreen(props: MenuScreenProps) {
  // ★ プロパティも分割代入で受け取ります
  const { 
    currentUser, setCurrentUser, dailyProgress, challengeSettings, 
    targetKyu, setTargetKyu, selectedInputMode, setSelectedInputMode,
    rickMode, setRickMode, reviewCandidates, reviewRevealed, toggleReviewReveal,
    hasParentChallenge, startGame, setView, fetchCollection, renderCalendar,
    stopSpeaking, fetchAdminStats, setAdminTargetUser, renderReading
  } = props;

  // view === 'menu' で定義されていたローカル変数を展開
  const streak = dailyProgress?.streak || 0; 
  const goal = challengeSettings?.reward_goal_days || 14; 
  const rewardName = challengeSettings?.reward_text || '好きなおやつ';
  
  let nextRewardMsg = "";
  if (streak < goal) {
      nextRewardMsg = `あと${goal - streak}日で${rewardName}！🎁`;
  } else { 
      const remaining = goal - (streak % goal); 
      nextRewardMsg = (remaining === goal && streak > 0) ? `🎉 目標の${goal}日達成！${rewardName}をGET！` : `あと${remaining}日で${rewardName}！🎁`; 
  }

  const isRickDone = dailyProgress?.details?.some((d: any) => d.mode === MODE_NAMES['rick_challenge'] && d.result === 'done'); 
  const isParentDone = dailyProgress?.details?.some((d: any) => d.mode === MODE_NAMES['parent_challenge'] && d.result === 'done'); 
  const isWeekendDone = dailyProgress?.details?.some((d: any) => d.mode === MODE_NAMES['weekend'] && d.result === 'done'); 
  const displayCount = challengeSettings?.quest_count || 5;

  return (
    <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-12 px-4 pb-10 font-sans transition-colors duration-500`}>
      <div className="absolute top-4 right-4 flex flex-wrap justify-end gap-2 max-w-[70%]">
        {USERS.map((u: any) => (
          <button key={u.id} onClick={() => setCurrentUser(u)} className={`px-3 py-1.5 rounded-full text-xs font-black transition-all shadow-sm ${currentUser.id === u.id ? `bg-gradient-to-r ${u.hue} text-white scale-110 ring-2 ring-white/50` : 'bg-white/50 text-stone-500 opacity-90 hover:bg-white'}`}>
            {getUserFirstName(u.name)}
          </button>
        ))}
      </div>

      <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl mb-4 relative mt-4">
        <img src="/Rick.png" alt="Rick" className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-stone-900/40 text-white text-[10px] text-center font-bold py-0.5 backdrop-blur-sm tracking-widest">ナビゲーター</div>
      </div>
      <h1 className={`text-3xl font-black ${currentUser.text} mb-2 tracking-widest drop-shadow-sm`}>毎日漢検クエスト</h1>
      
      <div className="w-full max-w-sm bg-white p-4 rounded-3xl shadow-lg mb-6 border-b-4 border-stone-200">
          <p className="text-xs font-black text-stone-400 mb-3 flex items-center justify-center gap-1"><span>🎯</span> 出題するカテゴリ</p>
          <select value={targetKyu} onChange={e => setTargetKyu(e.target.value)} className="w-full p-3 border-2 border-stone-200 rounded-xl text-sm font-black text-stone-700 bg-stone-50 outline-none focus:border-sky-400 mb-5 text-center shadow-inner">
            <option value="all">すべてのカテゴリから出題</option>
            {CATEGORIES.filter((c: any) => c.id !== 'general').map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <p className="text-xs font-black text-stone-400 mb-3 flex items-center justify-center gap-1"><span>🕹️</span> 回答モード</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button onClick={() => setSelectedInputMode('quiz_kanji')} className={`py-3 rounded-xl font-black text-xs transition-all border-b-4 active:translate-y-1 active:border-b-0 ${selectedInputMode === 'quiz_kanji' ? `bg-orange-500 text-white border-orange-600 shadow-md` : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>🔘 4択で選ぶ</button>
            <button onClick={() => setSelectedInputMode('typing_read')} className={`py-3 rounded-xl font-black text-xs transition-all border-b-4 active:translate-y-1 active:border-b-0 ${selectedInputMode === 'typing_read' ? 'bg-indigo-500 text-white border-indigo-600 shadow-md' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>⌨️ 読み入力</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSelectedInputMode('write_canvas')} className={`py-3 rounded-xl font-black text-xs transition-all border-b-4 active:translate-y-1 active:border-b-0 ${selectedInputMode === 'write_canvas' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>✍️ 手書き</button>
            <button onClick={() => setSelectedInputMode('write_self')} className={`py-3 rounded-xl font-black text-xs transition-all border-b-4 active:translate-y-1 active:border-b-0 ${selectedInputMode === 'write_self' ? 'bg-sky-500 text-white border-sky-600 shadow-md' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>🧠 自己判定</button>
          </div>
      </div>
      
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-5 mb-5 text-center border-b-4 border-stone-200 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-6xl opacity-10">🔥</div>
          <p className="text-xs font-black text-sky-600 mb-2 animate-pulse">{getDailyMessage(currentUser.id)}</p>
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
              {reviewCandidates.map((w: any) => {
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

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-6 mb-6 relative border-2 border-stone-50">
        <div className="flex items-center justify-between mb-3"><span className="text-stone-500 font-bold text-sm">📅 今日の進捗</span><span className={`text-2xl font-black ${currentUser.text}`}>{dailyProgress?.count || 0} <span className="text-base text-stone-400">/ {displayCount} 問</span></span></div>
        <div className="w-full bg-stone-100 rounded-full h-5 shadow-inner p-0.5"><div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${currentUser.hue}`} style={{ width: `${Math.min(((dailyProgress?.count || 0) / displayCount) * 100, 100)}%` }}></div></div>
        {dailyProgress?.is_completed ? <p className="text-center text-orange-500 font-bold mt-3 animate-bounce">💮 今日のノルマ達成！えらい！</p> : <p className="text-center text-stone-400 text-xs mt-3 font-bold">目標まであと {Math.max(0, displayCount - (dailyProgress?.count || 0))} 問！</p>}
      </div>
      
      <div className="space-y-3 w-full max-w-sm mb-6">
        {hasParentChallenge && (
          <button onClick={() => { if (!isParentDone) startGame('parent_challenge'); }} className={`w-full py-4 px-6 rounded-2xl font-black shadow-lg transform transition-all flex items-center justify-between ${isParentDone ? 'bg-stone-200 text-white shadow-none' : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white animate-pulse active:scale-95'}`}>
            <div className="flex items-center gap-3"><span className="text-2xl">🔥</span> <span className="tracking-wide">パパからの挑戦状</span></div>
            {isParentDone && <span className="bg-white/30 px-3 py-1 rounded-full text-xs">クリア済</span>}
          </button>
        )}

        <button onClick={() => { if (!dailyProgress?.is_completed) startGame('daily'); }} className={`w-full py-5 px-6 rounded-2xl font-black shadow-xl transform transition-all flex items-center justify-between ${dailyProgress?.is_completed ? 'bg-sky-200 text-white shadow-none' : `bg-gradient-to-r ${currentUser.hue} text-white hover:opacity-90 active:scale-95`}`}>
          <div className="flex items-center gap-3"><span className="text-3xl">🚀</span> <span className="text-xl tracking-wider">今日の冒険へ</span></div>
          {dailyProgress?.is_completed ? <span className="bg-white/30 px-3 py-1 rounded-full text-xs">クリア済</span> : <span className="bg-white/30 px-3 py-1 rounded-full text-sm">{displayCount}問</span>}
        </button>
        
        <div className={`w-full p-4 rounded-2xl shadow-md border-2 transition-all ${isRickDone ? 'bg-stone-100 border-stone-200' : 'bg-white border-stone-100'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><span className="text-xl">⚡</span> <span className={`font-bold ${isRickDone ? 'text-stone-400' : 'text-stone-700'}`}>Rickの特訓</span></div>
                {isRickDone && <span className="text-xs text-stone-400 font-bold">クリア済</span>}
            </div>
            <div className="flex gap-1 mb-3">
                <button onClick={() => setRickMode('read')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${rickMode === 'read' ? 'bg-orange-500 text-white shadow-inner' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}>👀 読む</button>
                <button onClick={() => setRickMode('think')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${rickMode === 'think' ? 'bg-sky-500 text-white shadow-inner' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}>🧠 思い浮かべる</button>
                <button onClick={() => setRickMode('write')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${rickMode === 'write' ? 'bg-emerald-500 text-white shadow-inner' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}>✍️ 手書き</button>
            </div>
            <button onClick={() => { if (!isRickDone) startGame('rick_challenge'); }} className={`w-full py-3 rounded-xl font-black text-sm tracking-widest transition-all ${isRickDone ? 'bg-stone-200 text-white cursor-not-allowed' : 'bg-stone-800 text-white shadow-md active:scale-95 hover:bg-stone-700'}`}>特訓スタート！</button>
        </div>

        <button onClick={() => startGame('weekend')} className={`w-full py-3 px-6 rounded-2xl font-bold shadow-md transform transition-all flex items-center justify-between ${isWeekendDone ? 'bg-stone-200 text-white shadow-none' : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white active:scale-95'}`}>
          <div className="flex items-center gap-3"><span className="text-xl">🏰</span> <span>週末ボスバトル</span></div>
          {isWeekendDone && <span className="bg-white/30 px-3 py-1 rounded-full text-xs">撃破済</span>}
        </button>

        <button onClick={() => startGame('revenge')} className="w-full py-4 px-6 rounded-2xl font-black shadow-md transform transition-all flex items-center justify-center bg-stone-800 text-rose-400 border-b-4 border-stone-900 hover:bg-stone-700 active:translate-y-1 active:border-b-0 tracking-widest gap-2"><span className="text-xl">💀</span> リベンジ (無限復習)</button>

        <div className="flex space-x-3 mt-4">
          <button onClick={fetchCollection} className="flex-1 bg-white border-b-4 border-emerald-500 text-emerald-600 font-black py-4 px-4 rounded-2xl shadow-sm active:translate-y-1 active:border-b-0 transition flex justify-center items-center gap-2"><span className="text-xl">📖</span> 言葉の図鑑</button>
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
      <button onClick={() => { stopSpeaking(); fetchAdminStats(currentUser); setAdminTargetUser(currentUser); }} className="mb-8 bg-stone-300 hover:bg-stone-400 text-stone-600 font-bold py-3 px-8 rounded-full w-full max-w-xs shadow-sm text-sm transition">👨‍👩‍👧‍👦 保護者メニューへ</button>
    </div>
  );
}