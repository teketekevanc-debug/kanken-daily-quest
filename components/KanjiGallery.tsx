// components/KanjiGallery.tsx
'use client'
import React, { useState } from 'react'

type KanjiGalleryProps = {
  words: any[];
  renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
  speakWord: (text: string) => void;
  getFullReading: (reading: string, okurigana?: string | null) => string;
  toggleMyNoteStatus: (id: number, isCurrentlyMyNote: boolean) => void;
}

export default function KanjiGallery({ words, renderReading, speakWord, getFullReading, toggleMyNoteStatus }: KanjiGalleryProps) {
  const [flashcardMode, setFlashcardMode] = useState<'normal'|'hide_reading'|'hide_kanji'>('normal');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);

  const openModal = (idx: number) => {
    setSelectedIndex(idx);
    setRevealed(false);
  }

  // ポップアップ時の文字数に応じたフォントサイズ調整
  const getDynamicFontSize = (text: string) => {
    const len = text.length;
    if (len >= 8) return 'text-3xl leading-snug';
    if (len >= 5) return 'text-4xl leading-tight';
    if (len === 4) return 'text-5xl leading-tight';
    return 'text-[5rem] leading-none'; // 1〜3文字の場合は従来通り大きく
  };

  return (
    <div className="w-full flex flex-col h-full relative">
      {/* 隠す機能のトグルボタン */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-stone-100 rounded-xl mb-4 shrink-0 border border-stone-200">
        <button onClick={() => setFlashcardMode('normal')} className={`py-2 rounded-lg text-xs font-black transition-colors ${flashcardMode === 'normal' ? 'bg-white shadow-sm text-stone-700' : 'text-stone-500 hover:bg-stone-200'}`}>すべて表示</button>
        <button onClick={() => setFlashcardMode('hide_reading')} className={`py-2 rounded-lg text-xs font-black transition-colors ${flashcardMode === 'hide_reading' ? 'bg-sky-600 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-200'}`}>よみ隠す</button>
        <button onClick={() => setFlashcardMode('hide_kanji')} className={`py-2 rounded-lg text-xs font-black transition-colors ${flashcardMode === 'hide_kanji' ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-200'}`}>漢字隠す</button>
      </div>

      {/* グリッド表示エリア（スクロール対応） */}
      <div className="grid grid-cols-3 gap-3 overflow-y-auto pb-10 no-scrollbar content-start flex-1">
        {words.length > 0 ? words.map((w, i) => (
          <div key={w.id} onClick={() => openModal(i)} className="bg-white rounded-[1.5rem] p-2 border-2 border-stone-200 shadow-sm flex flex-col items-center justify-center relative aspect-square cursor-pointer active:scale-95 transition-transform">
            <div className="text-xl mb-1">{w.emoji || '📝'}</div>
            
            <div className="relative w-full text-center px-1 flex-1 flex items-center justify-center">
              <span className={`${w.kanji.length >= 5 ? 'text-sm' : w.kanji.length >= 4 ? 'text-lg' : 'text-2xl'} font-black text-stone-800 leading-tight break-words`}>
                {flashcardMode === 'hide_kanji' ? '？' : w.kanji}
              </span>
            </div>
            
            <div className="relative mt-1 w-full text-center">
              {/* フリガナの視認性向上（濃い色、少し大きく、枠線追加） */}
              <span className="text-[11px] font-black text-sky-700 bg-sky-50 px-1 py-1 rounded-lg inline-block w-full truncate text-center border border-sky-100 shadow-sm">
                {flashcardMode === 'hide_reading' ? '？？？' : renderReading(w.reading, w.okurigana)}
              </span>
            </div>
            
            {w.currentStatus === 'mynote' && <div className="absolute top-2 right-2 text-[10px]">⭐</div>}
            {w.mistakeCount > 0 && <div className="absolute top-2 left-2 text-[10px] bg-rose-100 text-rose-600 px-1.5 rounded-md font-black shadow-sm">{w.mistakeCount}</div>}
          </div>
        )) : (
          <div className="col-span-3 text-center py-10 text-stone-400 font-bold text-sm border-2 border-dashed border-stone-200 rounded-xl bg-white/50">
            漢字が見つかりませんでした。
          </div>
        )}
      </div>

      {/* 詳細ポップアップ（モーダル） */}
      {selectedIndex !== null && words[selectedIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedIndex(null)}>
          {/* ↓ max-h-[85dvh] と overflow-y-auto を追加して見切れを防止 */}
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-5 sm:p-6 relative shadow-2xl flex flex-col max-h-[85dvh] overflow-y-auto animate-in zoom-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedIndex(null)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 bg-stone-100 rounded-full w-8 h-8 flex items-center justify-center font-black shrink-0">✕</button>
            
            <div className="text-center mt-4 flex-1">
              <div className="text-3xl mb-2">{words[selectedIndex].emoji || '📝'}</div>
              
              {/* 文字数に応じてフォントサイズを動的変更 */}
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
                <div className="text-left bg-amber-50 p-4 rounded-xl border border-amber-200 mb-4">
                  <span className="text-xs font-black text-amber-600 block mb-1">📜 なりたち・解説</span>
                  <p className="text-sm font-bold text-amber-900 leading-relaxed">{words[selectedIndex].origin_logic}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
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

            <div className="flex justify-between mt-6 pt-4 border-t border-stone-100 shrink-0">
              <button onClick={() => { setSelectedIndex(prev => prev! > 0 ? prev! - 1 : prev); setRevealed(false); }} disabled={selectedIndex === 0} className="text-stone-400 font-black px-4 disabled:opacity-30 py-2 active:scale-90">◀ 前へ</button>
              <span className="text-xs font-bold text-stone-400 flex items-center">{selectedIndex + 1} / {words.length}</span>
              <button onClick={() => { setSelectedIndex(prev => prev! < words.length - 1 ? prev! + 1 : prev); setRevealed(false); }} disabled={selectedIndex === words.length - 1} className="text-stone-400 font-black px-4 disabled:opacity-30 py-2 active:scale-90">次へ ▶</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}