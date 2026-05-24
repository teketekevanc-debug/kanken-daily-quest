'use client'
import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '@/lib/constants';

type CollectionScreenProps = {
    currentUser: any;
    setView: (view: string) => void;
    allWordsList: any[];
    challengeSettings: any;
    speakWord: (text: string) => void;
    renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
    getFullReading: (reading: string, okurigana?: string | null) => string;
    stopSpeaking: () => void;
    onViewCard?: () => void;
};

export default function CollectionScreen(props: CollectionScreenProps) {
    const { 
        currentUser, setView, allWordsList, challengeSettings, 
        speakWord, renderReading, getFullReading, stopSpeaking, onViewCard 
    } = props;
    
    const [mainTab, setMainTab] = useState<'words'|'tips'>('words');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [flashcardMode, setFlashcardMode] = useState<'normal'|'hide_kanji'|'hide_reading'>('normal');
    
    // グリッドでのクイズ表示用に保持
    const [revealedCards, setRevealedCards] = useState<number[]>([]);
    // ★ フラッシュカードの現在地インデックス
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const unlockedTips = challengeSettings?.unlocked_tips || [];

    const categoryStats = useMemo(() => {
        return CATEGORIES.map(cat => {
            const words = allWordsList.filter(w => w.kanji_level === cat.id);
            const [total] = [words.length];
            const mastered = words.filter(w => w.currentStatus === 'gold').length;
            return { ...cat, total, mastered };
        });
    }, [allWordsList]);

    const filteredWords = useMemo(() => {
        return allWordsList.filter(w => {
            if (w.kanji_level !== selectedCategory) return false;
            if (searchQuery && !w.kanji.includes(searchQuery) && !w.reading.includes(searchQuery)) return false;
            return true;
        });
    }, [allWordsList, selectedCategory, searchQuery]);

    // グリッドのタップ時の挙動（クイズ表示を解除 ＆ フラッシュカードを開く）
    const handleCardClick = (w: any, index: number) => { 
        if (!revealedCards.includes(w.id)) {
            setRevealedCards([...revealedCards, w.id]);
        }
        if (onViewCard) onViewCard();
        setSelectedIndex(index);
    };

    return (
        <div className={`min-h-screen ${currentUser.light} p-4 font-sans pb-24`}>
          <div className="max-w-2xl mx-auto">
            
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => { 
                    if (selectedCategory) { setSelectedCategory(null); } 
                    else { setView('menu'); stopSpeaking(); } 
                }} 
                className="text-stone-500 font-black bg-white px-5 py-2 rounded-full shadow-sm hover:bg-stone-50 transition active:scale-95"
              >
                {selectedCategory ? '← もどる' : '🏠 むらへ'}
              </button>
              <h2 className="text-xl font-black text-stone-700 tracking-tighter">
                {mainTab === 'words' ? '📖 言葉の図鑑' : '🎁 たからもの'}
              </h2>
            </div>

            <div className="flex p-1 bg-stone-200/50 rounded-2xl mb-6">
                <button 
                    onClick={() => setMainTab('words')} 
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${mainTab === 'words' ? 'bg-white text-emerald-600 shadow-md' : 'text-stone-500'}`}
                >
                    漢字ずかん
                </button>
                <button 
                    onClick={() => setMainTab('tips')} 
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${mainTab === 'tips' ? 'bg-amber-700 text-amber-100 shadow-md' : 'text-stone-500'}`}
                >
                    豆知識 ({unlockedTips.length})
                </button>
            </div>

            {mainTab === 'words' && (
              <>
                {!selectedCategory ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                        {categoryStats.map(cat => (
                            <button 
                                key={cat.id} 
                                onClick={() => setSelectedCategory(cat.id)}
                                className="w-full bg-white p-5 rounded-[1.5rem] shadow-sm border-b-4 border-stone-200 flex items-center justify-between group active:scale-98 transition-all"
                            >
                                <div className="text-left">
                                    <p className="text-lg font-black text-stone-700">{cat.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 transition-all duration-1000" 
                                                style={{ width: `${(cat.mastered / (cat.total || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-black text-stone-400">{cat.mastered} / {cat.total}</span>
                                    </div>
                                </div>
                                <span className="text-stone-300 group-hover:text-emerald-500 transition-colors">▶︎</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-white rounded-3xl p-5 shadow-md border-2 border-stone-100 mb-6">
                          <input 
                            type="text" 
                            placeholder="かんじ・よみでさがす..." 
                            className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl py-3 px-5 mb-4 font-bold outline-none focus:border-emerald-400 text-stone-700" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                          />
                          <div className="grid grid-cols-3 gap-2 p-1 bg-stone-100 rounded-2xl">
                            <button onClick={() => setFlashcardMode('normal')} className={`py-2 rounded-xl text-xs font-black ${flashcardMode === 'normal' ? 'bg-white shadow-sm text-emerald-600' : 'text-stone-500'}`}>すべて</button>
                            <button onClick={() => setFlashcardMode('hide_reading')} className={`py-2 rounded-xl text-xs font-black ${flashcardMode === 'hide_reading' ? 'bg-sky-500 text-white shadow-sm' : 'text-stone-500'}`}>よみ隠す</button>
                            <button onClick={() => setFlashcardMode('hide_kanji')} className={`py-2 rounded-xl text-xs font-black ${flashcardMode === 'hide_kanji' ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500'}`}>漢字隠す</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {filteredWords.map((w, index) => (
                            <div key={w.id} onClick={() => handleCardClick(w, index)} className="bg-white rounded-[2rem] p-3 border-b-4 border-stone-200 shadow-sm flex flex-col items-center justify-center relative aspect-square cursor-pointer active:scale-95 transition-transform overflow-hidden">
                              <div className="text-2xl mb-1">{w.emoji}</div>
                              <div className="relative w-full text-center">
                                <span className="text-3xl font-black text-stone-800 leading-none block truncate">{w.kanji}</span>
                                {flashcardMode === 'hide_kanji' && !revealedCards.includes(w.id) && (
                                  <div className="absolute inset-0 bg-stone-800 rounded-xl flex items-center justify-center"><span className="text-white text-xl">?</span></div>
                                )}
                              </div>
                              <div className="relative mt-2 w-full text-center">
                                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full inline-block truncate max-w-full">{w.reading}</span>
                                {flashcardMode === 'hide_reading' && !revealedCards.includes(w.id) && (
                                  <div className="absolute inset-0 bg-stone-600 rounded-full flex items-center justify-center w-[80%] mx-auto"><span className="text-white text-[9px]">?</span></div>
                                )}
                              </div>
                              {w.currentStatus === 'gold' && <div className="absolute top-2 right-2 text-xs">👑</div>}
                            </div>
                          ))}
                        </div>
                    </div>
                )}
              </>
            )}

            {mainTab === 'tips' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {unlockedTips.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {unlockedTips.map((tip: string, i: number) => (
                                <div key={i} className="relative group">
                                    <div className="absolute -inset-1 bg-amber-200/30 rounded-[2rem] blur-sm"></div>
                                    <div className="relative bg-[#fdf6e3] p-8 rounded-[1.5rem] shadow-xl border-x-[12px] border-amber-900/10 overflow-hidden">
                                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-800/20 rounded-tl-3xl"></div>
                                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-800/20 rounded-br-3xl"></div>
                                        
                                        <div className="flex items-start gap-4">
                                            <span className="text-4xl drop-shadow-md shrink-0">📜</span>
                                            <p className="text-lg font-black text-amber-900 leading-relaxed text-left font-serif italic">
                                                {tip}
                                            </p>
                                        </div>
                                        <p className="text-right text-[10px] font-black text-amber-800/40 mt-4 tracking-tighter">DISCOVERED TIP #{i+1}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/50 border-4 border-dashed border-stone-200 rounded-[3rem] p-16 text-center">
                            <p className="text-6xl mb-6 grayscale opacity-30">📦</p>
                            <p className="text-stone-400 font-black">まだお宝がありません。<br/>冒険（10分学習）をして<br/>宝箱をみつけよう！</p>
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* ==========================================
              ★ タスク 3: 巨大フラッシュカード化
             ========================================== */}
          {selectedIndex !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/90 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedIndex(null)}>
              <div className="bg-white w-full max-w-2xl min-h-[400px] rounded-[3rem] p-8 relative flex flex-col items-center justify-center shadow-2xl animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                
                <button onClick={() => setSelectedIndex(null)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 text-3xl font-black">✖</button>
                
                <div className="flex items-center justify-between w-full mt-4">
                  {/* ◀ 前へ */}
                  <button 
                    onClick={() => setSelectedIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev))}
                    disabled={selectedIndex === 0}
                    className={`text-6xl transition-all p-4 ${selectedIndex === 0 ? 'text-stone-200 cursor-not-allowed' : 'text-sky-500 active:scale-90 hover:text-sky-600'}`}
                  >◀</button>

                  {/* 巨大な漢字と読み表示 */}
                  <div className="text-center px-4 flex flex-col items-center animate-in zoom-in duration-300" key={selectedIndex}>
                    <div className="text-6xl mb-4">{filteredWords[selectedIndex].emoji}</div>
                    <h2 className="text-[8rem] sm:text-[10rem] font-black text-stone-800 leading-none mb-6 drop-shadow-md">
                      {filteredWords[selectedIndex].kanji}
                    </h2>
                    <div className="flex items-center gap-4 bg-sky-50 py-3 px-8 rounded-full border-4 border-sky-100 shadow-sm">
                      <p className="text-4xl sm:text-5xl font-black text-sky-700">
                        {renderReading(filteredWords[selectedIndex].reading, filteredWords[selectedIndex].okurigana)}
                      </p>
                      <button 
                        onClick={() => speakWord(getFullReading(filteredWords[selectedIndex].reading, filteredWords[selectedIndex].okurigana))} 
                        className="bg-white text-sky-500 p-3 rounded-full shadow-md active:scale-90 transition-transform"
                      >
                        <span className="text-2xl">🔊</span>
                      </button>
                    </div>
                    
                    {filteredWords[selectedIndex].usage_example && (
                      <p className="mt-6 text-xl font-bold text-stone-600">
                        「{filteredWords[selectedIndex].usage_example.replace('□', '〇')}」
                      </p>
                    )}
                    {filteredWords[selectedIndex].origin_logic && (
                       <div className="mt-4 bg-amber-50 p-4 rounded-2xl border-2 border-amber-100">
                         <span className="text-sm font-black text-amber-500 block mb-1">📜 なりたち</span>
                         <p className="text-lg font-bold text-amber-900/80">{filteredWords[selectedIndex].origin_logic}</p>
                       </div>
                    )}
                  </div>

                  {/* 次へ ▶ */}
                  <button 
                    onClick={() => setSelectedIndex(prev => (prev !== null && prev < filteredWords.length - 1 ? prev + 1 : prev))}
                    disabled={selectedIndex === filteredWords.length - 1}
                    className={`text-6xl transition-all p-4 ${selectedIndex === filteredWords.length - 1 ? 'text-stone-200 cursor-not-allowed' : 'text-sky-500 active:scale-90 hover:text-sky-600'}`}
                  >▶</button>
                </div>
                
                <p className="absolute bottom-6 text-stone-400 font-bold tracking-widest">
                  {selectedIndex + 1} / {filteredWords.length}
                </p>
              </div>
            </div>
          )}
        </div>
    );
}