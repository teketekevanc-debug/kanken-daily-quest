'use client'
import React, { useState } from 'react';
import { CATEGORIES } from '@/lib/constants';

type CollectionScreenProps = {
    currentUser: any;
    setView: (view: string) => void;
    allWordsList: any[];
    speakWord: (text: string) => void;
    renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
    getFullReading: (reading: string, okurigana?: string | null) => string;
    stopSpeaking: () => void;
};

export default function CollectionScreen(props: CollectionScreenProps) {
    const { currentUser, setView, allWordsList, speakWord, renderReading, getFullReading, stopSpeaking } = props;
    
    // 図鑑の中だけで使うState
    const [collectionTab, setCollectionTab] = useState('kyu5');
    const [childCommentInput, setChildCommentInput] = useState('');
    const [flashcardMode, setFlashcardMode] = useState<'normal'|'hide_kanji'|'hide_reading'>('normal');
    const [revealedCards, setRevealedCards] = useState<number[]>([]);

    const filteredWords = allWordsList.filter(w => {
        if (w.kanji_level !== collectionTab) return false;
        if (childCommentInput && !w.kanji.includes(childCommentInput) && !w.reading.includes(childCommentInput)) return false;
        return true;
    });

    const toggleCardReveal = (w: any) => { 
        if (revealedCards.includes(w.id)) {
            setRevealedCards(revealedCards.filter(rid => rid !== w.id)); 
            stopSpeaking();
        } else {
            setRevealedCards([...revealedCards, w.id]);
            const parts = [getFullReading(w.reading, w.okurigana)];
            if (w.usage_example) parts.push(w.usage_example);
            if (w.origin_logic) parts.push(w.origin_logic);
            else if (w.sentence) parts.push(w.sentence);
            speakWord(parts.join('。'));
        }
    };

    return (
        <div className={`min-h-screen ${currentUser.light} p-4 font-sans pb-20`}>
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => { setView('menu'); setChildCommentInput(''); setRevealedCards([]); }} className="text-stone-500 font-bold bg-white px-4 py-2 rounded-full shadow-sm hover:bg-stone-50 transition">← もどる</button>
              <h2 className="text-2xl font-black text-stone-700">📖 言葉の図鑑</h2>
            </div>
  
            {/* 級選択タブ */}
            <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-4">
              {CATEGORIES.map((cat: any) => (
                <button key={cat.id} onClick={() => setCollectionTab(cat.id)} className={`px-6 py-3 rounded-full text-md font-black whitespace-nowrap transition-all shadow-sm ${collectionTab === cat.id ? 'bg-emerald-600 text-white scale-105' : 'bg-white text-stone-500'}`}>{cat.name}</button>
              ))}
            </div>
  
            {/* 検索・モード切替 */}
            <div className="bg-white rounded-3xl p-5 shadow-md border-2 border-stone-100 mb-6">
              <input type="text" placeholder="漢字や読みで検索..." className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl py-3 px-5 mb-4 font-bold text-lg outline-none focus:border-emerald-400 text-stone-700" value={childCommentInput} onChange={(e) => setChildCommentInput(e.target.value)} />
              <div className="grid grid-cols-3 gap-3 p-1 bg-stone-100 rounded-2xl">
                <button onClick={() => setFlashcardMode('normal')} className={`py-3 rounded-xl text-sm font-black ${flashcardMode === 'normal' ? 'bg-white shadow-sm text-emerald-600' : 'text-stone-500'}`}>表示</button>
                <button onClick={() => setFlashcardMode('hide_reading')} className={`py-3 rounded-xl text-sm font-black ${flashcardMode === 'hide_reading' ? 'bg-sky-500 text-white shadow-sm' : 'text-stone-500'}`}>読み隠す</button>
                <button onClick={() => setFlashcardMode('hide_kanji')} className={`py-3 rounded-xl text-sm font-black ${flashcardMode === 'hide_kanji' ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500'}`}>漢字隠す</button>
              </div>
            </div>
  
            {/* カード一覧 */}
            <div className="grid grid-cols-3 gap-3">
              {filteredWords.map((w) => (
                <div key={w.id} onClick={() => toggleCardReveal(w)} className="bg-white rounded-3xl p-3 border-b-4 border-stone-200 shadow-sm flex flex-col items-center justify-center relative aspect-square cursor-pointer active:scale-95 transition-transform overflow-hidden">
                  <div className="text-3xl mb-1 drop-shadow-sm">{w.emoji}</div>
                  <div className="relative w-full text-center">
                    <span className="text-4xl font-black text-stone-800 leading-none block px-1 truncate">{w.kanji}</span>
                    {flashcardMode === 'hide_kanji' && !revealedCards.includes(w.id) && (
                      <div className="absolute inset-0 bg-stone-800 rounded-xl flex items-center justify-center shadow-inner"><span className="text-white text-xl">?</span></div>
                    )}
                  </div>
                  <div className="relative mt-2 w-full text-center flex justify-center">
                    <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-full inline-block truncate max-w-[95%] border border-sky-100">{w.reading}</span>
                    {flashcardMode === 'hide_reading' && !revealedCards.includes(w.id) && (
                      <div className="absolute inset-0 bg-stone-600 rounded-full flex items-center justify-center w-[80%] mx-auto shadow-inner"><span className="text-white text-[10px]">?</span></div>
                    )}
                  </div>
                  {w.currentStatus === 'gold' && <div className="absolute top-2 right-2 text-sm drop-shadow-sm">👑</div>}
                </div>
              ))}
            </div>
          </div>
  
          {/* 詳細表示モーダル（完全復元） */}
          {revealedCards.length > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setRevealedCards([])}>
              {allWordsList.filter(x => revealedCards.includes(x.id)).map(sw => (
                <div key={sw.id} className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200 border-4 border-white flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                  <div className="p-8 text-center bg-stone-50 border-b-2 border-stone-100 shrink-0 relative">
                    {sw.currentStatus === 'gold' && <div className="absolute top-4 right-4 text-3xl drop-shadow-sm">👑</div>}
                    <div className="text-5xl mb-4">{sw.emoji}</div>
                    <h2 className="text-7xl font-black text-stone-800 mb-2">{sw.kanji}</h2>
                    <p className="text-2xl font-bold text-sky-600 bg-sky-50 px-6 py-2 rounded-full inline-block mt-2 border border-sky-100">{renderReading(sw.reading, sw.okurigana)}</p>
                  </div>
                  
                  <div className="p-6 space-y-4 overflow-y-auto no-scrollbar bg-white">
                    {sw.usage_example && (
                      <div className="bg-sky-50/50 p-4 rounded-3xl border-2 border-sky-100/50 text-left">
                        <span className="text-xs font-black text-sky-500 block mb-1">📖 例文</span>
                        <p className="text-base font-bold text-stone-700 leading-relaxed">「{sw.usage_example}」</p>
                      </div>
                    )}
                    {sw.origin_logic && (
                      <div className="bg-amber-50/50 p-4 rounded-3xl border-2 border-amber-100/50 text-left">
                        <span className="text-xs font-black text-amber-500 block mb-1">💡 成り立ち・豆知識</span>
                        <p className="text-base font-bold text-amber-800 leading-relaxed">{sw.origin_logic}</p>
                      </div>
                    )}
                    {sw.sentence && (
                      <div className="bg-stone-50 p-4 rounded-3xl border-2 border-stone-100 text-left">
                        <span className="text-xs font-black text-stone-400 block mb-1">❓ クイズで出た文</span>
                        <p className="text-base font-bold text-stone-600 leading-relaxed">{sw.sentence.replace('□', '〇')}</p>
                      </div>
                    )}
                  </div>
  
                  <div className="p-4 bg-white border-t border-stone-100 shrink-0">
                    <button onClick={() => setRevealedCards([])} className="w-full py-4 bg-stone-800 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition">図鑑へもどる 🐾</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
}