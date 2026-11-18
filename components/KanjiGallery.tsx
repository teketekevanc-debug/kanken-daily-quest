// components/KanjiGallery.tsx
'use client'
import React, { useState } from 'react'

type KanjiGalleryProps = {
  words: any[];
  renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
  speakWord: (text: string) => void;
  getFullReading: (reading: string, okurigana?: string | null) => string;
  toggleMyNoteStatus: (id: number, isCurrentlyMyNote: boolean) => void;
  onWordViewed?: (word: any, timeSpent: number) => void; // ★追加
}

export default function KanjiGallery({ words, renderReading, speakWord, getFullReading, toggleMyNoteStatus, onWordViewed }: KanjiGalleryProps) {
  const [flashcardMode, setFlashcardMode] = useState<'normal'|'hide_reading'|'hide_kanji'>('normal');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [viewStartTime, setViewStartTime] = useState<number | null>(null); // ★追加

  // ★追加：閲覧時間を記録して送信する関数
  const recordViewTime = (idx: number) => {
    if (viewStartTime !== null && onWordViewed && words[idx]) {
      const timeSpent = Math.round((Date.now() - viewStartTime) / 1000);
      if (timeSpent > 0) onWordViewed(words[idx], timeSpent);
    }
  }

  const openModal = (idx: number) => {
    setSelectedIndex(idx);
    setRevealed(false);
    setViewStartTime(Date.now()); // ★計測スタート
  }

  const closeModal = () => {
    if (selectedIndex !== null) recordViewTime(selectedIndex); // ★計測ストップ＆送信
    setSelectedIndex(null);
    setViewStartTime(null);
  }

  const goPrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      recordViewTime(selectedIndex); // ★前の単語の時間を送信
      setSelectedIndex(selectedIndex - 1);
      setRevealed(false);
      setViewStartTime(Date.now()); // ★新しい単語の計測スタート
    }
  }

  const goNext = () => {
    if (selectedIndex !== null && selectedIndex < words.length - 1) {
      recordViewTime(selectedIndex); // ★前の単語の時間を送信
      setSelectedIndex(selectedIndex + 1);
      setRevealed(false);
      setViewStartTime(Date.now()); // ★新しい単語の計測スタート
    }
  }

  const getDynamicFontSize = (text: string) => {
    const len = text.length;
    if (len >= 8) return 'text-3xl leading-snug';
    if (len >= 5) return 'text-4xl leading-tight';
    if (len === 4) return 'text-5xl leading-tight';
    return 'text-[5rem] leading-none';
  };

  return (
    <div className="w-full flex flex-col h-full relative">
      <div className="grid grid-cols-3 gap-2 p-1 bg-stone-100 rounded-xl mb-4 shrink-0 border border-stone-200">
        <button onClick={() => setFlashcardMode('normal')} className={`py-2 rounded-lg text-xs font-black transition-colors ${flashcardMode === 'normal' ? 'bg-white shadow-sm text-stone-700' : 'text-stone-500 hover:bg-stone-200'}`}>すべて表示</button>
        <button onClick={() => setFlashcardMode('hide_reading')} className={`py-2 rounded-lg text-xs font-black transition-colors ${flashcardMode === 'hide_reading' ? 'bg-sky-600 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-200'}`}>よみ隠す</button>
        <button onClick={() => setFlashcardMode('hide_kanji')} className={`py-2 rounded-lg text-xs font-black transition-colors ${flashcardMode === 'hide_kanji' ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-200'}`}>漢字隠す</button>
      </div>

      <div className="grid grid-cols-3 gap-3 overflow-y-auto pb-10 no-scrollbar content-start flex-1">
        {words.length > 0 ? words.map((w, i) => {
          const isViewed = w.currentStatus !== 'learning' || w.mistakeCount > 0;
          return (
            <div key={w.id} onClick={() => openModal(i)} className="bg-white rounded-[1.5rem] p-2 border-2 border-stone-200 shadow-sm flex flex-col items-center justify-center relative aspect-square cursor-pointer active:scale-95 transition-transform">
              <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 items-start">
                {w.mistakeCount > 0 && <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 rounded font-black shadow-sm">ミス{w.mistakeCount}</span>}
                {!isViewed && <span className="text-[8px] bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded font-black shadow-sm">NEW</span>}
              </div>
              <div className="absolute top-2 right-2 flex gap-1 z-10 items-center">
                {isViewed && <span className="text-[10px] opacity-40">✅</span>}
                {w.currentStatus === 'mynote' && <span className="text-[10px]">⭐</span>}
              </div>
              <div className="text-xl mb-1 mt-3">{w.emoji || '📝'}</div>
              <div className="relative w-full text-center px-1 flex-1 flex items-center justify-center">
                <span className={`${w.kanji.length >= 5 ? 'text-sm' : w.kanji.length >= 4 ? 'text-lg' : 'text-2xl'} font-black text-stone-800 leading-tight break-words`}>
                  {flashcardMode === 'hide_kanji' ? '？' : w.kanji}
                </span>
              </div>
              <div className="relative mt-1 w-full text-center">
                <span className="text-[11px] font-black text-sky-700 bg-sky-50 px-1 py-1 rounded-lg inline-block w-full truncate text-center border border-sky-100 shadow-sm">
                  {flashcardMode === 'hide_reading' ? '？？？' : renderReading(w.reading, w.okurigana)}
                </span>
              </div>
            </div>
          )
        }) : (
          <div className="col-span-3 text-center py-10 text-stone-400 font-bold text-sm border-2 border-dashed border-stone-200 rounded-xl bg-white/50">
            漢字が見つかりませんでした。
          </div>
        )}
      </div>

      {selectedIndex !== null && words[selectedIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-in fade-in" onClick={closeModal}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] relative shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 bg-stone-100 rounded-full w-8 h-8 flex items-center justify-center font-black shrink-0 z-20 shadow-sm">✕</button>
            
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 no-scrollbar relative">
              <div className="text-center mt-6">
                <div className="flex justify-center gap-2 mb-2">
                  {(words[selectedIndex].currentStatus !== 'learning' || words[selectedIndex].mistakeCount > 0) ? (
                    <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded-full border border-stone-200">✅ 学習済み</span>
                  ) : (
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-100 px-2 py-1 rounded-full border border-sky-200">✨ 未出題（NEW）</span>
                  )}
                  {words[selectedIndex].mistakeCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-full border border-rose-200">🔥 苦手</span>
                  )}
                </div>
                <div className="text-3xl mb-2">{words[selectedIndex].emoji || '📝'}</div>
                <h2 className={`${getDynamicFontSize(words[selectedIndex].kanji)} font-black text-stone-800 mb-5 break-words`}>
                  {flashcardMode === 'hide_kanji' && !revealed ? '？' : words[selectedIndex].kanji}
                </h2>
                
                <div className="flex items-center justify-center gap-3 bg-sky-50 py-3 px-4 rounded-2xl border-2 border-sky-100 mb-5 mx-1 shadow-sm">
                  <p className="text-xl sm:text-2xl font-black text-sky-700 break-words text-left">
                    {flashcardMode === 'hide_reading' && !revealed ? '？？？' : renderReading(words[selectedIndex].reading, words[selectedIndex].okurigana)}
                  </p>
                  <button onClick={() => speakWord(getFullReading(words[selectedIndex].reading, words[selectedIndex].okurigana))} className="bg-white text-sky-500 w-10 h-10 rounded-full shadow-sm flex items-center justify-center active:scale-90 text-lg shrink-0 border border-sky-100">🔊</button>
                </div>

                {words[selectedIndex].usage_example && (
                  <p className="text-stone-700 font-bold text-left bg-stone-50 p-4 rounded-xl mb-4 border border-stone-200 text-sm leading-relaxed">
                    「{words[selectedIndex].usage_example.replace('□', '〇')}」
                  </p>
                )}
                {words[selectedIndex].origin_logic && (
                  <div className="text-left bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6">
                    <span className="text-xs font-black text-amber-600 block mb-1">📜 なりたち・解説</span>
                    <p className="text-sm font-bold text-amber-900 leading-relaxed">{words[selectedIndex].origin_logic}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pb-2">
                  {flashcardMode !== 'normal' && !revealed && (
                    <button onClick={() => setRevealed(true)} className="w-full bg-sky-600 text-white font-black py-3 rounded-xl active:scale-95 transition shadow-sm border-b-4 border-sky-700">
                      答えを見る
                    </button>
                  )}
                  <button 
                    onClick={() => toggleMyNoteStatus(words[selectedIndex].id, words[selectedIndex].currentStatus === 'mynote')}
                    className={`w-full font-black py-3 rounded-xl border-2 active:scale-95 transition ${words[selectedIndex].currentStatus === 'mynote' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}
                  >
                    {words[selectedIndex].currentStatus === 'mynote' ? '⭐ ノートから外す' : '⭐ じぶんノートへ'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 shrink-0 rounded-b-[2rem]">
              <div className="flex justify-between items-center">
                <button onClick={goPrev} disabled={selectedIndex === 0} className="text-stone-500 hover:text-stone-700 font-black px-4 disabled:opacity-30 py-2 active:scale-90 bg-white rounded-lg border border-stone-200 shadow-sm">◀ 前へ</button>
                <span className="text-xs font-bold text-stone-400 flex items-center">{selectedIndex + 1} / {words.length}</span>
                <button onClick={goNext} disabled={selectedIndex === words.length - 1} className="text-stone-500 hover:text-stone-700 font-black px-4 disabled:opacity-30 py-2 active:scale-90 bg-white rounded-lg border border-stone-200 shadow-sm">次へ ▶</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}