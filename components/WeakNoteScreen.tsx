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
  onWordViewed?: (word: any, timeSpent: number) => void; // ★ 追加
}

// ★ ここ（引数の中）に onWordViewed を追加しています！
export default function WeakNoteScreen({ currentUser, allWordsList, setView, toggleMyNoteStatus, renderReading, speakWord, getFullReading, onWordViewed }: WeakNoteScreenProps) {
  const weakWords = allWordsList
    .filter(w => w.mistakeCount > 0 && w.currentStatus !== 'archived' && w.kanji_level?.startsWith('v2_'))
    .sort((a, b) => b.mistakeCount - a.mistakeCount);

  return (
    <div className={`h-screen ${currentUser.light} flex flex-col font-sans`}>
      <div className="bg-rose-50 p-4 flex justify-between items-center border-b border-rose-200 shrink-0">
        <h2 className="font-black text-rose-800 tracking-widest text-lg">💀 苦手ノート</h2>
        <button onClick={() => setView('menu')} className="text-xs font-bold text-rose-600 bg-white px-4 py-2 rounded-md border border-rose-200 shadow-sm active:scale-95">戻る</button>
      </div>
      <div className="p-3 bg-stone-50 text-xs font-bold text-stone-500 text-center shrink-0 border-b border-stone-200">
        間違えた回数が多い順に並んでいます（全 {weakWords.length} 問）
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-stone-100">
         <KanjiGallery words={weakWords} renderReading={renderReading} speakWord={speakWord} getFullReading={getFullReading} toggleMyNoteStatus={toggleMyNoteStatus} onWordViewed={onWordViewed} />
      </div>
    </div>
  )
}