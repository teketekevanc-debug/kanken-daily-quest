// components/DictionaryScreen.tsx
'use client'
import React, { useState } from 'react'
import KanjiGallery from './KanjiGallery'
import { CATEGORIES } from '@/lib/constants'
import FloatingTimer from './FloatingTimer'

type DictionaryScreenProps = {
  currentUser: any;
  allWordsList: any[];
  setView: (view: string) => void;
  toggleMyNoteStatus: (id: number, isCurrentlyMyNote: boolean) => void;
  renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
  speakWord: (text: string) => void;
  getFullReading: (reading: string, okurigana?: string | null) => string;
onWordViewed?: (word: any, timeSpent: number) => void;
}

export default function DictionaryScreen({ currentUser, allWordsList, setView, toggleMyNoteStatus, renderReading, speakWord, getFullReading, onWordViewed }: DictionaryScreenProps) {
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

  // ★ 追加：進捗（見たかどうか）の計算
  const totalCount = filteredWords.length;
  // 一度でも正解してランクが上がったか、ミスをして記録がつけば「学習済み（見た）」と判定
  const viewedCount = filteredWords.filter(w => w.currentStatus !== 'learning' || w.mistakeCount > 0).length;
  const progressPercent = totalCount > 0 ? Math.floor((viewedCount / totalCount) * 100) : 0;

  return (
    <div className={`h-screen ${currentUser.light} flex flex-col font-sans`}>
      
      {/* ヘッダー部分 */}
      <div className="bg-stone-100 p-4 flex justify-between items-center border-b border-stone-200 shrink-0">
        <h2 className="font-black text-stone-600 tracking-widest text-lg">📚 漢字辞書</h2>
        <button onClick={() => setView('menu')} className="text-xs font-bold text-stone-500 bg-white px-4 py-2 rounded-md border border-stone-200 shadow-sm active:scale-95">戻る</button>
      </div>

      {/* 検索・絞り込みエリア */}
      <div className="p-4 bg-stone-50 shrink-0 border-b border-stone-200">
        <div className="flex gap-2 mb-3">
          <button onClick={() => { setTab('current'); setSelectedCategory('all'); }} className={`flex-1 py-2 font-bold text-sm rounded-md transition-colors ${tab === 'current' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200'}`}>今の漢字</button>
          <button onClick={() => { setTab('legacy'); setSelectedCategory('all'); }} className={`flex-1 py-2 font-bold text-sm rounded-md transition-colors ${tab === 'legacy' ? 'bg-stone-500 text-white' : 'bg-white text-stone-500 border border-stone-200'}`}>むかしのデータ</button>
        </div>
        
        <select 
          value={selectedCategory} 
          onChange={e => setSelectedCategory(e.target.value)} 
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
          className="w-full bg-white border border-stone-200 rounded-md py-2 px-3 text-sm font-bold outline-none focus:border-stone-400 text-stone-800"
        />
      </div>

      {/* ★ 追加：学習進捗のプログレスバー */}
      <div className="px-4 py-3 bg-white border-b border-stone-200 shrink-0">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
            <span className="opacity-70">✅</span> 一度でも出題された漢字
          </span>
          <span className="text-sm font-black text-stone-800">{viewedCount} <span className="text-xs font-bold text-stone-400">/ {totalCount} 問</span></span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
    {/* 漢字ギャラリーエリア */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-100 relative">
         <FloatingTimer /> {/* ★追加 */}
         <KanjiGallery words={filteredWords} renderReading={renderReading} speakWord={speakWord} getFullReading={getFullReading} toggleMyNoteStatus={toggleMyNoteStatus} onWordViewed={onWordViewed}/>
      </div>
          </div>
  )
}