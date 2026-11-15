// components/NotebookScreen.tsx
'use client'
import React from 'react'

type NotebookScreenProps = {
  currentUser: any;
  logData: any;          // ★ dailyProgressではなく、選択された日のログを受け取る
  displayDate: string;   // ★ 「今日」または「〇年〇月〇日」の文字
  setView: (view: string) => void;
}

export default function NotebookScreen({ currentUser, logData, displayDate, setView }: NotebookScreenProps) {
  const details = logData?.details || [];
  const todaySeconds = logData?.study_time_seconds || 0;
  const todayMinutes = Math.floor(todaySeconds / 60);

  // 新規と復習の数をカウント
  const newCount = details.filter((d:any) => d.taskType === 'new').length;
  const reviewCount = details.filter((d:any) => d.taskType === 'review').length;

  return (
    <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-8 px-4 font-sans pb-10`}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border-2 border-stone-200 overflow-hidden flex flex-col min-h-[600px]">
        
        {/* ヘッダー */}
        <div className="bg-stone-100 p-4 flex justify-between items-center border-b border-stone-200">
          <h2 className="font-black text-stone-600 tracking-widest text-lg">📖 {displayDate}の記録</h2>
          <button onClick={() => setView('menu')} className="text-xs font-bold text-stone-500 bg-white px-4 py-2 rounded-md border border-stone-200 shadow-sm active:scale-95">戻る</button>
        </div>

        {/* メインエリア */}
        <div className="p-4 flex-1 bg-stone-50 relative">
           {/* ノート風の赤い縦線 */}
           <div className="absolute left-6 top-0 bottom-0 w-px bg-rose-200"></div>
           
           <div className="relative pl-6">
             {/* サマリー */}
             <div className="mb-6 flex gap-4 text-xs font-bold text-stone-500 border-b border-stone-200 pb-2">
               <p>学習時間: <span className="text-stone-800 text-base">{todayMinutes}分</span></p>
               <p>新規: <span className="text-stone-800 text-base">{newCount}問</span></p>
               <p>復習: <span className="text-stone-800 text-base">{reviewCount}問</span></p>
             </div>

             {/* 解答リスト */}
             {details.length > 0 ? (
               <div className="space-y-3">
                 {details.map((d: any, i: number) => (
                   <div key={i} className={`p-3 rounded-lg border-2 flex justify-between items-center shadow-sm bg-white ${d.result === 'correct' ? 'border-stone-100' : 'border-rose-200'}`}>
                     <div className="flex items-center gap-4">
                       <span className="text-2xl">{d.result === 'correct' ? '⭕' : '❌'}</span>
                       <span className="font-black text-2xl text-stone-800">{d.word}</span>
                       {d.taskType === 'review' && (
                         <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-black border border-sky-200">復習</span>
                       )}
                     </div>
                     <div className="text-right flex flex-col items-end">
                       <span className={`text-xs font-black px-2 py-1 rounded-md ${(d.timeSpent || 0) > 15 ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-400'}`}>
                         ⏱️ {d.timeSpent || 0}秒
                       </span>
                       {(d.timeSpent || 0) > 15 && <span className="text-[9px] text-rose-500 mt-1 font-bold">時間がかかりました</span>}
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-20 text-stone-400 font-bold border-2 border-dashed border-stone-200 rounded-xl mt-4 bg-white">
                 この日の記録はありません。
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  )
}