'use client'
import React, { useState } from 'react'
import { USERS, CATEGORIES, MODE_NAMES, getUserFirstName, getDailyMessage } from '@/lib/constants'

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
  const { 
    currentUser, setCurrentUser, dailyProgress, challengeSettings, 
    targetKyu, setTargetKyu, selectedInputMode, setSelectedInputMode,
    rickMode, setRickMode, reviewCandidates, reviewRevealed, toggleReviewReveal,
    hasParentChallenge, startGame, setView, fetchCollection, renderCalendar,
    stopSpeaking, fetchAdminStats, setAdminTargetUser, renderReading
  } = props;

  const [showTipsModal, setShowTipsModal] = useState(false);

  const streakData = [dailyProgress?.streak || 0];
  const [streak] = streakData;

  const goalData = [challengeSettings?.reward_goal_days || 14];
  const [goal] = goalData;

  const rewardTextData = [challengeSettings?.reward_text || '好きなおやつ'];
  const [rewardName] = rewardTextData;

  const tipsData = [challengeSettings?.unlocked_tips || []];
  const [unlockedTips] = tipsData;
  
  const remainder = streak % goal;
  const daysUntil = (remainder === 0 && streak > 0) ? goal : goal - remainder;
  const nextRewardMsg = (remainder === 0 && streak > 0) 
    ? `🎉 目標の${goal}日達成！${rewardName}をGET！` 
    : `あと${daysUntil}日で${rewardName}！🎁`;

  const isRickDone = dailyProgress?.details?.some((d: any) => d.mode === MODE_NAMES['rick_challenge'] && d.result === 'done'); 
  const isParentDone = dailyProgress?.details?.some((d: any) => d.mode === MODE_NAMES['parent_challenge'] && d.result === 'done'); 
  const isWeekendDone = dailyProgress?.details?.some((d: any) => d.mode === MODE_NAMES['weekend'] && d.result === 'done'); 
  
  const displayCountData = [challengeSettings?.quest_count || 5];
  const [displayCount] = displayCountData;

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
            {/* ★ ここが特訓用の封印ボタン */}
            <button 
              onClick={() => setSelectedInputMode('quiz_kanji')} 
              disabled={currentUser.id === 'brother'}
              className={`py-3 rounded-xl font-black transition-all border-b-4 flex flex-col items-center justify-center gap-1 ${
                currentUser.id === 'brother'
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60 border-stone-300'
                  : selectedInputMode === 'quiz_kanji' 
                    ? 'bg-orange-500 text-white border-orange-600 shadow-md active:translate-y-1 active:border-b-0' 
                    : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50 active:translate-y-1 active:border-b-0'
              }`}
            >
              <span className="text-xs">🔘 4択で選ぶ</span>
              {currentUser.id === 'brother' && <span className="text-[9px] text-rose-500 tracking-tighter">※特訓中につき封印！</span>}
            </button>
            <button onClick={() => setSelectedInputMode('typing_read')} className={`py-3 rounded-xl font-black text-xs transition-all border-b-4 active:translate-y-1 active:border-b-0 ${selectedInputMode === 'typing_read' ? 'bg-indigo-500 text-white border-indigo-600 shadow-md' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>⌨️ 読み入力</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSelectedInputMode('write_canvas')} className={`py-3 rounded-xl font-black text-xs transition-all border-b-4 active:translate-y-1 active:border-b-0 ${selectedInputMode === 'write_canvas' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>✍️ 手書き</button>
            <button onClick={() => setSelectedInputMode('write_self')} className={`py-3 rounded-xl font-black text-xs transition-all border-b-4 active:translate-y-1 active:border-b-0 ${selectedInputMode === 'write_self' ? 'bg-sky-500 text-white border-sky-600 shadow-md' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>🧠 自己判定</button>
          </div>
      </div>
      
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-5 mb-5 border-b-4 border-stone-200 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-6xl opacity-10">🔥</div>
          <p className="text-xs font-black text-sky-600 mb-2 animate-pulse">{getDailyMessage(currentUser.id)}</p>
          
          <div className="flex justify-between items-center mb-4 px-2">
            <div className="text-left">
              <p className="text-[10px] text-stone-400 font-bold mb-0.5">現在の連続クリア</p>
              <p className="text-4xl font-black text-orange-500 tracking-tighter">{streak} <span className="text-lg">日</span></p>
            </div>
            <div className="text-right bg-yellow-50 p-2 rounded-2xl border-2 border-yellow-100 shadow-inner min-w-[100px]">
              <p className="text-[9px] font-black text-yellow-600 mb-0.5">持っている数</p>
              <p className="text-2xl font-black text-yellow-500">{challengeSettings?.owned_rewards || 0} <span className="text-xs">個</span></p>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 text-orange-600 font-black py-2 px-4 rounded-2xl text-sm inline-block shadow-sm w-full mb-3">
            {nextRewardMsg}
          </div>

          <div className="mt-3 border-t border-stone-100 pt-3">
            <details className="group">
              <summary className="list-none cursor-pointer">
                <div className="text-[10px] font-black text-stone-400 flex items-center justify-center gap-1 group-open:text-sky-500 transition-colors">
                  <span>📜</span> ご褒美をもらうためのヒント 
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </div>
              </summary>
              <div className="mt-2 bg-stone-50 p-3 rounded-xl text-[11px] font-bold text-stone-600 leading-relaxed text-left animate-in fade-in slide-in-from-top-1">
                <p>・しっかり集中して、漢字の世界を冒険しよう！</p>
                <p>・10分くらい、問題を解いたり図鑑をながめていると、クリアしたあとに宝箱が出るかも...？</p>
                <p>・「手書き」や「自己判定」で頑張ると、いいことがあるかも！？</p>
                <p className="text-[9px] text-stone-400 mt-2">※ 途中で画面を閉じると、時間はリセットされるから注意してね！</p>
              </div>
            </details>
          </div>

          <button 
            onClick={() => setShowTipsModal(true)} 
            className="w-full bg-gradient-to-b from-amber-700 to-amber-900 text-amber-100 font-black py-4 rounded-2xl active:scale-95 transition flex items-center justify-center gap-3 shadow-[0_5px_0_0_rgba(69,26,3,1)] hover:brightness-110 mb-2 mt-4"
          >
            <span className="text-2xl">🎁</span>
            <div className="text-left leading-tight">
              <p className="text-[10px] text-amber-300/80">あつめたお宝</p>
              <p className="text-sm tracking-widest">豆知識コレクション ({unlockedTips.length})</p>
            </div>
          </button>
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
                <button onClick={() => setRickMode('think')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${rickMode === 'think' ? 'bg-sky-500 text-white shadow-inner' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}>🧠 思い</button>
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
          <button onClick={fetchCollection} className="flex-1 bg-white border-b-4 border-emerald-500 text-emerald-600 font-black py-4 px-4 rounded-2xl shadow-sm active:translate-y-1 active:border-b-0 transition flex justify-center items-center gap-2 hover:bg-stone-50"><span className="text-xl">📖</span> 図鑑</button>
          <button onClick={() => startGame('free')} className="flex-1 bg-white border-b-4 border-sky-400 text-sky-500 font-black py-4 px-4 rounded-2xl shadow-sm active:translate-y-1 active:border-b-0 transition flex justify-center items-center gap-2 hover:bg-stone-50"><span className="text-xl">⚔️</span> フリー</button>
        </div>
      </div>

      <div className="mb-6 w-full max-w-sm">{renderCalendar()}</div>

      {dailyProgress?.parent_reply && (
        <div className="mb-8 w-full max-w-sm bg-white border-4 border-orange-200 rounded-3xl p-6 shadow-lg relative">
          <div className="absolute -top-4 left-6 bg-orange-400 text-white text-xs font-black tracking-widest px-4 py-1.5 rounded-full shadow-sm">パパ・ママからのお返事</div>
          <p className="text-left text-base font-bold text-stone-700 whitespace-pre-wrap leading-relaxed mt-2">「{dailyProgress.parent_reply}」</p>
        </div>
      )}

      {(currentUser.id === 'kenta' || currentUser.id === 'mami') && (
        <button 
          onClick={() => { stopSpeaking(); fetchAdminStats(currentUser); setAdminTargetUser(currentUser); setView('admin'); }} 
          className="mb-8 bg-stone-800 hover:bg-stone-900 text-white font-black py-4 px-8 rounded-2xl w-full max-w-xs shadow-xl text-sm transition-all active:scale-95 border-b-4 border-stone-950 flex items-center justify-center gap-2"
        >
          <span>👨‍👩‍👧‍👦</span> 保護者管理メニュー
        </button>
      )}

      {showTipsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowTipsModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            
            <div className="bg-yellow-50 p-6 text-center border-b-4 border-yellow-100 shrink-0">
              <h3 className="text-2xl font-black text-yellow-600 flex items-center justify-center gap-2"><span>📚</span> 秘密の豆知識ノート</h3>
              <p className="text-xs font-bold text-yellow-700 mt-2">今まで集めた知識：{unlockedTips.length}個</p>
            </div>
            
            <div className="p-6 overflow-y-auto bg-stone-50 flex-1 space-y-3 no-scrollbar">
              {unlockedTips.length > 0 ? (
                unlockedTips.map((tip: string, i: number) => (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border-2 border-stone-100">
                    <p className="text-sm font-bold text-stone-700 leading-relaxed">{tip}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-4xl mb-4">🔒</p>
                  <p className="text-stone-400 font-bold leading-relaxed">まだ豆知識がありません。<br/>10分しっかり勉強して<br/>クリア後の宝箱を開けよう！</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-stone-100 shrink-0">
              <button onClick={() => setShowTipsModal(false)} className="w-full py-4 bg-stone-800 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition">村へもどる 🐾</button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}