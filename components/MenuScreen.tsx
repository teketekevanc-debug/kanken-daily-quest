// components/MenuScreen.tsx
'use client'
import React from 'react'
import { USERS, CATEGORIES } from '@/lib/constants'

type MenuScreenProps = {
  currentUser: any;
  setCurrentUser: (u: any) => void;
  dailyProgress: any;
  startGame: (mode: string) => void;
  setView: (view: string) => void;
  renderCalendar: () => React.ReactNode;
  stopSpeaking: () => void;
  fetchAdminStats: (u: any) => void;
  setAdminTargetUser: (u: any) => void;
}

export default function MenuScreen({ currentUser, setCurrentUser, dailyProgress, startGame, setView, renderCalendar, stopSpeaking, fetchAdminStats, setAdminTargetUser }: MenuScreenProps) {
  const isParent = currentUser.id === 'mami' || currentUser.id === 'kenta';
  
  const drillCategories = CATEGORIES.filter(c => c.id.startsWith('v2_rank_a'));
  
  const studyMinutes = Math.floor((dailyProgress?.study_time_seconds || 0) / 60);

  return (
    <div className={`h-screen flex flex-col font-sans ${currentUser.light}`}>
      <div className={`p-5 sm:p-6 ${currentUser.color} text-white shrink-0 shadow-md relative overflow-hidden`}>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold opacity-80 bg-black/20 px-2 py-1 rounded-full mb-2 inline-block">毎日漢検クエスト</span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{currentUser.name}</h1>
          </div>
          <select 
            className="bg-white/20 text-white font-bold text-sm px-3 py-2 rounded-xl outline-none appearance-none border border-white/30 cursor-pointer backdrop-blur-sm shadow-sm"
            value={currentUser.id} 
            onChange={(e) => {
              const nu = USERS.find(u => u.id === e.target.value);
              if (nu) setCurrentUser(nu);
            }}
          >
            {USERS.map(u => <option key={u.id} value={u.id} className="text-stone-800">{u.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {!isParent && studyMinutes >= 15 && (
          <div className="bg-amber-100 border-2 border-amber-300 p-4 rounded-2xl shadow-sm flex items-center gap-4 animate-in fade-in zoom-in">
            <div className="text-4xl animate-bounce">🔥</div>
            <div>
              <h3 className="font-black text-amber-800 text-lg leading-tight">今日の学習: {studyMinutes} 分達成！</h3>
              <p className="text-xs font-bold text-amber-700 mt-1">よくがんばってるね！すごい！</p>
            </div>
          </div>
        )}

        <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-stone-200">
          <h3 className="font-black text-stone-600 mb-4 flex items-center gap-2">
            <span>🎯</span> さあ、今日のクエストに出発しよう！
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {drillCategories.map(c => (
              <button 
                key={c.id}
                type="button"
                onClick={() => startGame(c.id)} 
                className="w-full bg-stone-800 text-white font-black py-4 px-3 rounded-2xl shadow-sm active:scale-95 transition-transform flex flex-col items-center justify-center gap-1 border-b-4 border-stone-900"
              >
                <span className="text-xs opacity-80 font-bold">ドリルに挑戦</span>
                <span className="text-sm sm:text-base leading-tight text-center">{c.name.replace('【新】', '')}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setView('dictionary')} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 active:scale-95 transition text-left flex flex-col gap-2">
            <span className="text-2xl">📚</span>
            <span className="font-black text-stone-600 text-sm">漢字辞書</span>
          </button>
          <button type="button" onClick={() => setView('weak_note')} className="bg-rose-50 p-4 rounded-2xl shadow-sm border border-rose-200 active:scale-95 transition text-left flex flex-col gap-2">
            <span className="text-2xl">💀</span>
            <span className="font-black text-rose-800 text-sm">苦手ノート</span>
          </button>
          <button type="button" onClick={() => setView('my_note')} className="col-span-2 bg-yellow-50 p-4 rounded-2xl shadow-sm border border-yellow-200 active:scale-95 transition flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div className="flex flex-col">
              <span className="font-black text-yellow-800 text-sm">自分ノート</span>
              <span className="text-xs font-bold text-yellow-600 opacity-80">お気に入りの漢字だけを復習！</span>
            </div>
          </button>
        </div>

        <div>
          <h3 className="font-black text-stone-500 text-sm mb-3 flex items-center gap-2">
            <span>📅</span> 取り組みのきろく
          </h3>
          {renderCalendar()}
        </div>

        {isParent && (
          <div className="pt-4 border-t border-stone-200">
             <button 
               type="button" 
               onClick={async (e) => {
                 e.preventDefault();
                 try {
                   setAdminTargetUser(USERS[0]);
                   await fetchAdminStats(USERS[0]);
                   setView('admin');
                 } catch (err) {
                   console.error("保護者メニュー移動エラー:", err);
                   alert("データ読み込み中にエラーが発生しました。");
                 }
               }} 
               className="w-full bg-stone-200 text-stone-600 font-black py-4 rounded-2xl active:scale-95 transition border border-stone-300"
             >
               ⚙️ 保護者メニュー・管理
             </button>
          </div>
        )}
      </div>
    </div>
  )
}