// components/DictionaryScreen.tsx
'use client'
import React, { useState } from 'react'
import KanjiGallery from './KanjiGallery'
import { CATEGORIES } from '@/lib/constants'

type DictionaryScreenProps = {
  currentUser: any;
  allWordsList: any[];
  setView: (view: string) => void;
  toggleMyNoteStatus: (id: number, isCurrentlyMyNote: boolean) => void;
  renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
  speakWord: (text: string) => void;
  getFullReading: (reading: string, okurigana?: string | null) => string;
}

export default function DictionaryScreen({ currentUser, allWordsList, setView, toggleMyNoteStatus, renderReading, speakWord, getFullReading }: DictionaryScreenProps) {
  const [tab, setTab] = useState<'current' | 'legacy'>('current');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const currentCategories = CATEGORIES.filter(c => c.id.startsWith('v2_'));
  const legacyCategories = CATEGORIES.filter(c => !c.id.startsWith('v2_') && c.id !== 'general');
  const activeCategories = tab === 'current' ? currentCategories : legacyCategories;

  const filteredWords = allWordsList.filter(w => {
    const isCurrent = w.kanji_level?.startsWith('v2_');
    if (tab === 'current' && !isCurrent) return false;
    if (tab === 'legacy' && isCurrent) return false;
    if (selectedCategory !== 'all' && w.kanji_level !== selectedCategory) return false;
    if (search && !w.kanji.includes(search) && !w.reading.includes(search)) return false;
    return true;
  });

  return (
    // ★ h-screen と flex-col を使って画面全体を使い切る設定に変更
    <div className={`h-screen ${currentUser.light} flex flex-col font-sans`}>
      
      {/* ヘッダー部分（固定） */}
      <div className="bg-stone-100 p-4 flex justify-between items-center border-b border-stone-200 shrink-0">
        <h2 className="font-black text-stone-600 tracking-widest text-lg">📚 漢字辞書</h2>
        <button onClick={() => setView('menu')} className="text-xs font-bold text-stone-500 bg-white px-4 py-2 rounded-md border border-stone-200 shadow-sm active:scale-95">戻る</button>
      </div>

      {/* 検索・絞り込みエリア（固定） */}
      <div className="p-4 bg-stone-50 shrink-0 border-b border-stone-200">
        <div className="flex gap-2 mb-3">
          <button onClick={() => { setTab('current'); setSelectedCategory('all'); }} className={`flex-1 py-2 font-bold text-sm rounded-md transition-colors ${tab === 'current' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200'}`}>今の漢字</button>
          <button onClick={() => { setTab('legacy'); setSelectedCategory('all'); }} className={`flex-1 py-2 font-bold text-sm rounded-md transition-colors ${tab === 'legacy' ? 'bg-stone-500 text-white' : 'bg-white text-stone-500 border border-stone-200'}`}>むかしのデータ</button>
        </div>
        
       <select 
          value={selectedCategory} 
          onChange={e => setSelectedCategory(e.target.value)} 
          // ↓ 最後に text-stone-800 を追加しました
          className="w-full bg-white border border-stone-200 rounded-md py-2 px-3 text-sm font-bold outline-none focus:border-stone-400 mb-2 text-stone-800 appearance-none"
        >
          <option value="all" className="text-stone-800">すべての分類</option>
          {activeCategories.map(c => <option key={c.id} value={c.id} className="text-stone-800">{c.name}</option>)}
        </select>

        <input 
          type="text" 
          placeholder="漢字や読みで検索..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          // ↓ 最後に text-stone-800 を追加しました
          className="w-full bg-white border border-stone-200 rounded-md py-2 px-3 text-sm font-bold outline-none focus:border-stone-400 text-stone-800"
        />
      </div>

      {/* 漢字ギャラリーエリア（ここだけがスクロールする） */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-100">
         <KanjiGallery words={filteredWords} renderReading={renderReading} speakWord={speakWord} getFullReading={getFullReading} toggleMyNoteStatus={toggleMyNoteStatus} />
      </div>
    </div>
  )
}