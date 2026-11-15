// components/WeakNoteScreen.tsx
'use client'
import React from 'react'
import KanjiGallery from './KanjiGallery'

type WeakNoteScreenProps = {
  currentUser: any;
  allWordsList: any[];
  setView: (view: string) => void;
  toggleMyNoteStatus: (id: number, isCurrentlyMyNote: boolean) => void;
  renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
  speakWord: (text: string) => void;
  getFullReading: (reading: string, okurigana?: string | null) => string;
}

export default function WeakNoteScreen({ currentUser, allWordsList, setView, toggleMyNoteStatus, renderReading, speakWord, getFullReading }: WeakNoteScreenProps) {
  const weakWords = allWordsList
    .filter(w => w.mistakeCount > 0 && w.currentStatus !== 'archived' && w.kanji_level?.startsWith('v2_'))
    .sort((a, b) => b.mistakeCount - a.mistakeCount);

  return (
    <div className={`h-screen ${currentUser.light} flex flex-col font-sans`}>
      
      {/* ヘッダー部分（固定） */}
      <div className="bg-rose-50 p-4 flex justify-between items-center border-b border-rose-200 shrink-0">
        <h2 className="font-black text-rose-800 tracking-widest text-lg">💀 苦手ノート</h2>
        <button onClick={() => setView('menu')} className="text-xs font-bold text-rose-600 bg-white px-4 py-2 rounded-md border border-rose-200 shadow-sm active:scale-95">戻る</button>
      </div>
      
      {/* 説明文エリア（固定） */}
      <div className="p-3 bg-stone-50 text-xs font-bold text-stone-500 text-center shrink-0 border-b border-stone-200">
        間違えた回数が多い順に並んでいます（全 {weakWords.length} 問）
      </div>

      {/* 漢字ギャラリーエリア（ここだけがスクロールする） */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-100">
         <KanjiGallery words={weakWords} renderReading={renderReading} speakWord={speakWord} getFullReading={getFullReading} toggleMyNoteStatus={toggleMyNoteStatus} />
      </div>
    </div>
  )
}