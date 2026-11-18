// components/MyNoteScreen.tsx
'use client'
import React from 'react'
import KanjiGallery from './KanjiGallery'

type MyNoteScreenProps = {
  currentUser: any;
  allWordsList: any[];
  setView: (view: string) => void;
  toggleMyNoteStatus: (id: number, isCurrentlyMyNote: boolean) => void;
  renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
  speakWord: (text: string) => void;
  onWordViewed?: (word: any, timeSpent: number) => void;
  getFullReading: (reading: string, okurigana?: string | null) => string;
}

// ★修正：MyNoteScreen と MyNoteScreenProps に直して、onWordViewed を追加
export default function MyNoteScreen({ currentUser, allWordsList, setView, toggleMyNoteStatus, renderReading, speakWord, getFullReading, onWordViewed }: MyNoteScreenProps) {
  const myWords = allWordsList.filter(w => w.currentStatus === 'mynote');

  return (
    <div className={`h-screen ${currentUser.light} flex flex-col font-sans`}>
      
      {/* ヘッダー部分（固定） */}
      <div className="bg-yellow-50 p-4 flex justify-between items-center border-b border-yellow-200 shrink-0">
        <h2 className="font-black text-yellow-800 tracking-widest text-lg">⭐ 自分ノート</h2>
        <button onClick={() => setView('menu')} className="text-xs font-bold text-yellow-700 bg-white px-4 py-2 rounded-md border border-yellow-200 shadow-sm active:scale-95">戻る</button>
      </div>
      
      {/* 説明文エリア（固定） */}
      <div className="p-3 bg-stone-50 text-xs font-bold text-stone-500 text-center shrink-0 border-b border-stone-200">
        ⭐を外すと「アーカイブ」に保管されます（全 {myWords.length} 問）
      </div>

      {/* 漢字ギャラリーエリア（ここだけがスクロールする） */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-100">
         <KanjiGallery words={myWords} renderReading={renderReading} speakWord={speakWord} getFullReading={getFullReading} toggleMyNoteStatus={toggleMyNoteStatus} onWordViewed={onWordViewed}/>
      </div>
    </div>
  )
}