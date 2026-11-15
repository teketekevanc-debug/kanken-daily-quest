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
  getFullReading: (reading: string, okurigana?: string | null) => string;
}

export default function MyNoteScreen({ currentUser, allWordsList, setView, toggleMyNoteStatus, renderReading, speakWord, getFullReading }: MyNoteScreenProps) {
  const myWords = allWordsList.filter(w => w.currentStatus === 'mynote');

  return (
    <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-8 px-4 font-sans pb-10`}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border-2 border-stone-200 overflow-hidden flex flex-col min-h-[600px] max-h-[85vh]">
        <div className="bg-yellow-50 p-4 flex justify-between items-center border-b border-yellow-200 shrink-0">
          <h2 className="font-black text-yellow-800 tracking-widest text-lg">⭐ 自分ノート</h2>
          <button onClick={() => setView('menu')} className="text-xs font-bold text-yellow-700 bg-white px-4 py-2 rounded-md border border-yellow-200 shadow-sm active:scale-95">戻る</button>
        </div>
        <div className="p-3 bg-stone-50 text-xs font-bold text-stone-500 text-center shrink-0 border-b border-stone-200">
          ⭐を外すと「アーカイブ」に保管されます（全 {myWords.length} 問）
        </div>
        <div className="flex-1 overflow-hidden p-4 bg-white">
           <KanjiGallery words={myWords} renderReading={renderReading} speakWord={speakWord} getFullReading={getFullReading} toggleMyNoteStatus={toggleMyNoteStatus} />
        </div>
      </div>
    </div>
  )
}