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
    <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-8 px-4 font-sans pb-10`}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border-2 border-stone-200 overflow-hidden flex flex-col min-h-[600px] max-h-[85vh]">
        <div className="bg-rose-50 p-4 flex justify-between items-center border-b border-rose-200 shrink-0">
          <h2 className="font-black text-rose-800 tracking-widest text-lg">💀 苦手ノート</h2>
          <button onClick={() => setView('menu')} className="text-xs font-bold text-rose-600 bg-white px-4 py-2 rounded-md border border-rose-200 shadow-sm active:scale-95">戻る</button>
        </div>
        <div className="p-3 bg-stone-50 text-xs font-bold text-stone-500 text-center shrink-0 border-b border-stone-200">
          間違えた回数が多い順に並んでいます（全 {weakWords.length} 問）
        </div>
        <div className="flex-1 overflow-hidden p-4 bg-white">
           <KanjiGallery words={weakWords} renderReading={renderReading} speakWord={speakWord} getFullReading={getFullReading} toggleMyNoteStatus={toggleMyNoteStatus} />
        </div>
      </div>
    </div>
  )
}