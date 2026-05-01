'use client'
import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '@/lib/constants';

type CollectionScreenProps = {
    currentUser: any;
    setView: (view: string) => void;
    allWordsList: any[];
    challengeSettings: any; // ★ 追加：豆知識（unlocked_tips）が入っている
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
    
    // 表示モード切り替え ('words' | 'tips')
    const [mainTab, setMainTab] = useState<'words'|'tips'>('words');
    // 級の選択状態（null の時はリストを表示）
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [flashcardMode, setFlashcardMode] = useState<'normal'|'hide_kanji'|'hide_reading'>('normal');
    const [revealedCards, setRevealedCards] = useState<number[]>([]);

    // 豆知識（宝箱から出たヒント）
    const unlockedTips = challengeSettings?.unlocked_tips || [];

    // 各級の進捗計算（リスト表示用）
    const categoryStats = useMemo(() => {
        return CATEGORIES.map(cat => {
            const words = allWordsList.filter(w => w.kanji_level === cat.id);
            const [total] = [words.length];
            const mastered = words.filter(w => w.currentStatus === 'gold').length;
            return { ...cat, total, mastered };
        });
    }, [allWordsList]);

    // フィルタリングされた単語
    const filteredWords = useMemo(() => {
        return allWordsList.filter(w => {
            if (w.kanji_level !== selectedCategory) return false;
            if (searchQuery && !w.kanji.includes(searchQuery) && !w.reading.includes(searchQuery)) return false;
            return true;
        });
    }, [allWordsList, selectedCategory, searchQuery]);

    const toggleCardReveal = (w: any) => { 
        if (revealedCards.includes(w.id)) {
            setRevealedCards(revealedCards.filter(rid => rid !== w.id)); 
            stopSpeaking();
        } else {
            if (onViewCard) onViewCard();
            setRevealedCards([...revealedCards, w.id]);
            // ★ 自動読み上げは停止（ユーザーの指示によりボタン式へ）
        }
    };

    return (
        <div className={`min-h-screen ${currentUser.light} p-4 font-sans pb-24`}>
          <div className="max-w-2xl mx-auto">
            
            {/* ヘッダー */}
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

            {/* メインタブ切り替え (図鑑 or 豆知識) */}
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

            {/* ==========================================
                漢字図鑑モード
               ========================================== */}
            {mainTab === 'words' && (
              <>
                {/* 級の選択リスト (タスク 3-2: リスト形式) */}
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
                    /* 単語グリッド表示 */
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
                          {filteredWords.map((w) => (
                            <div key={w.id} onClick={() => toggleCardReveal(w)} className="bg-white rounded-[2rem] p-3 border-b-4 border-stone-200 shadow-sm flex flex-col items-center justify-center relative aspect-square cursor-pointer active:scale-95 transition-transform overflow-hidden">
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

            {/* ==========================================
                豆知識モード (タスク 2-2: 宝箱UI)
               ========================================== */}
            {mainTab === 'tips' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {unlockedTips.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {unlockedTips.map((tip: string, i: number) => (
                                <div key={i} className="relative group">
                                    {/* 巻物（羊皮紙）風の背景 */}
                                    <div className="absolute -inset-1 bg-amber-200/30 rounded-[2rem] blur-sm"></div>
                                    <div className="relative bg-[#fdf6e3] p-8 rounded-[1.5rem] shadow-xl border-x-[12px] border-amber-900/10 overflow-hidden">
                                        {/* 飾り */}
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
              詳細カード (タスク 3-1: 読み上げ制限)
             ========================================== */}
          {revealedCards.length > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/90 backdrop-blur-md animate-in fade-in" onClick={() => setRevealedCards([])}>
              {allWordsList.filter(x => revealedCards.includes(x.id)).map(sw => (
                <div key={sw.id} className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                  
                  <div className="p-10 text-center bg-stone-50 border-b-2 border-stone-100 shrink-0 relative">
                    {sw.currentStatus === 'gold' && <div className="absolute top-6 right-8 text-4xl">👑</div>}
                    <div className="text-6xl mb-4">{sw.emoji}</div>
                    <h2 className="text-8xl font-black text-stone-800 mb-4">{sw.kanji}</h2>
                    
                    {/* ★ タスク 3-1: 読み上げボタン */}
                    <div className="flex items-center justify-center gap-3">
                        <div className="text-3xl font-black text-sky-600 bg-sky-50 px-8 py-3 rounded-full border-2 border-sky-100 shadow-inner">
                            {renderReading(sw.reading, sw.okurigana)}
                        </div>
                        <button 
                            onClick={() => speakWord(getFullReading(sw.reading, sw.okurigana))}
                            className="w-14 h-14 bg-sky-500 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform hover:bg-sky-400"
                        >
                            <span className="text-2xl">🔊</span>
                        </button>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-5 overflow-y-auto no-scrollbar bg-white flex-1">
                    {sw.usage_example && (
                      <div className="bg-emerald-50/50 p-5 rounded-[2rem] border-2 border-emerald-100/50 text-left">
                        <span className="text-xs font-black text-emerald-500 block mb-2">💡 例文でチェック</span>
                        <p className="text-lg font-bold text-stone-700 leading-relaxed">「{sw.usage_example}」</p>
                      </div>
                    )}
                    {sw.origin_logic && (
                      <div className="bg-amber-50/50 p-5 rounded-[2rem] border-2 border-amber-100/50 text-left">
                        <span className="text-xs font-black text-amber-500 block mb-2">📜 なりたち</span>
                        <p className="text-lg font-bold text-amber-900/80 leading-relaxed">{sw.origin_logic}</p>
                      </div>
                    )}
                  </div>
  
                  <div className="p-6 bg-stone-50 shrink-0">
                    <button onClick={() => setRevealedCards([])} className="w-full py-5 bg-stone-800 text-white rounded-[1.5rem] font-black text-xl shadow-xl active:scale-95 transition">ずかんを閉じる 🐾</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
}