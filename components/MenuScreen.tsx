// components/MenuScreen.tsx
'use client'
import React from 'react'
import { USERS, getUserFirstName } from '@/lib/constants'

type MenuScreenProps = {
  currentUser: any;
  setCurrentUser: (user: any) => void;
  dailyProgress: any;
  startGame: (mode: string) => void;
  setView: (view: any) => void;
  renderCalendar: () => React.ReactNode;
  stopSpeaking: () => void;
  fetchAdminStats: (user: any) => void;
  setAdminTargetUser: (user: any) => void;
}

export default function MenuScreen(props: MenuScreenProps) {
  const { 
    currentUser, setCurrentUser, dailyProgress, 
    startGame, setView, renderCalendar,
    stopSpeaking, fetchAdminStats, setAdminTargetUser
  } = props;

  // 今日の学習データ
  const todaySeconds = dailyProgress?.study_time_seconds || 0;
  const todayMinutes = Math.floor(todaySeconds / 60);
  const completedCount = dailyProgress?.count || 0;
  
  // 1セット10問として、何周クリアしたかを計算
  const setGoal = 10;
  const completedSets = Math.floor(completedCount / setGoal);
  const currentSetProgress = completedCount % setGoal;
  const isCompletedOnce = completedSets > 0;

  // 試験日（2027年2月1日）までのカウントダウン計算
  const getJSTDate = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const today = getJSTDate();
  today.setHours(0, 0, 0, 0);
  const examDayUtc = Date.UTC(2027, 1, 1);
  const diffDays = Math.max(0, Math.ceil((examDayUtc - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / (1000 * 60 * 60 * 24)));
  
  // 月・週の計算（概算）
  const diffMonths = Math.floor(diffDays / 30);
  const diffWeeks = Math.floor(diffDays / 7);

  return (
    <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-12 px-4 pb-10 font-sans`}>
      
      {/* ユーザー切り替え */}
      <div className="absolute top-4 left-4 flex flex-wrap justify-start gap-2 max-w-[55%] z-10">
        {USERS.map((u: any) => (
          <button 
            key={u.id} 
            onClick={() => setCurrentUser(u)} 
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all shadow-sm border-2 ${currentUser.id === u.id ? 'bg-white border-stone-800 text-stone-800' : 'bg-transparent border-transparent text-stone-400 hover:bg-stone-200'}`}
          >
            {getUserFirstName(u.name)}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm mt-8">
        <h1 className={`text-2xl font-black ${currentUser.text} mb-6 tracking-widest text-center`}>漢字練習帳</h1>

        {/* 受験本番までのカウントダウン */}
        <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-stone-200 mb-6 flex items-center justify-between">
            <div className="pl-3 border-l-4 border-rose-500">
                <p className="text-[10px] font-bold text-stone-500 mb-1">受験本番（2027年2月1日）まで</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-black text-stone-600">あと</span>
                    <span className="text-4xl font-black text-rose-600">{diffDays}</span>
                    <span className="text-sm font-black text-stone-600">日！</span>
                </div>
                {diffDays > 0 && (
                  <p className="text-[10px] font-bold text-stone-400 mt-1">
                    （約 <span className="text-stone-500">{diffMonths}ヶ月</span> / 約 <span className="text-stone-500">{diffWeeks}週間</span>）
                  </p>
                )}
            </div>
            <div className="text-3xl pr-2 opacity-80">🔥</div>
        </div>

        {/* タイムトラッカーと本日の進捗 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-stone-200 mb-6 relative overflow-hidden">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-rose-200"></div>
          
          <div className="pl-6">
            <p className="text-sm font-bold text-stone-500 mb-4 border-b border-stone-100 pb-2">今日の取り組み</p>
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-xs text-stone-400 font-bold mb-1">学習時間</p>
                <p className="text-3xl font-black text-stone-800">{todayMinutes} <span className="text-sm text-stone-500 font-bold">分</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-400 font-bold mb-1">ドリル進捗</p>
                <div className="flex items-baseline justify-end gap-1">
                  <p className="text-2xl font-black text-stone-800">{completedCount} <span className="text-sm text-stone-400 font-bold">問</span></p>
                </div>
              </div>
            </div>
            
            {/* プログレスバー（10問ごとのループを表示） */}
            <div className="w-full bg-stone-100 rounded-full h-2 mb-2 relative overflow-hidden">
              <div 
                className="bg-stone-800 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${(currentSetProgress / setGoal) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs font-bold text-stone-400">次のスタンプまで あと{setGoal - currentSetProgress}問</p>
              {isCompletedOnce && (
                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  💮 {completedSets}周クリア！
                </p>
              )}
            </div>
          </div>
        </div>

        {/* メインアクション：ドリル */}
        <button 
          onClick={() => startGame('daily_drill')} 
          className="w-full py-6 px-6 rounded-lg font-black shadow-sm transition-all border-2 mb-6 flex items-center justify-between group bg-stone-800 border-stone-900 text-white hover:bg-stone-700 active:scale-95"
        >
          <div className="flex items-center gap-4">
            <span className="text-2xl">✍️</span> 
            <span className="text-lg tracking-widest">{isCompletedOnce ? 'ドリル（追加 10問）' : 'ドリル'}</span>
          </div>
          <span className="text-xl opacity-50 group-hover:translate-x-1 transition-transform">→</span>
        </button>

        {/* 3つのノート・辞書への導線 */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button onClick={() => setView('weak_note')} className="py-4 px-2 rounded-lg font-bold shadow-sm transition-all border-2 bg-white border-stone-200 text-stone-600 hover:bg-stone-50 active:scale-95 flex flex-col items-center gap-2">
            <span className="text-2xl">💀</span>
            <span className="text-xs tracking-widest">苦手ノート</span>
          </button>
          <button onClick={() => setView('my_note')} className="py-4 px-2 rounded-lg font-bold shadow-sm transition-all border-2 bg-white border-stone-200 text-stone-600 hover:bg-stone-50 active:scale-95 flex flex-col items-center gap-2">
            <span className="text-2xl">⭐</span>
            <span className="text-xs tracking-widest">自分ノート</span>
          </button>
          <button onClick={() => setView('dictionary')} className="col-span-2 py-4 px-4 rounded-lg font-bold shadow-sm transition-all border-2 bg-white border-stone-200 text-stone-600 hover:bg-stone-50 active:scale-95 flex items-center justify-center gap-3">
            <span className="text-xl">📚</span>
            <span className="text-sm tracking-widest">漢字辞書</span>
          </button>
        </div>

        {/* カレンダー（ドリルの記録） */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 pl-2">
            <span className="text-lg">📖</span>
            <h2 className="text-sm font-bold text-stone-600">ドリルの記録</h2>
          </div>
          {renderCalendar()}
          <p className="text-[10px] text-stone-400 mt-2 text-center">※日付をタップするとその日のノートが見られます</p>
        </div>

        {/* 保護者管理メニュー */}
        {(currentUser.id === 'kenta' || currentUser.id === 'mami') && (
          <button 
            onClick={() => { stopSpeaking(); fetchAdminStats(currentUser); setAdminTargetUser(currentUser); setView('admin'); }} 
            className="w-full py-4 rounded-lg font-bold transition-all bg-stone-200 text-stone-700 hover:bg-stone-300 text-sm border-2 border-stone-300 mt-4"
          >
            ⚙️ 保護者管理
          </button>
        )}

      </div>
    </div>
  );
}