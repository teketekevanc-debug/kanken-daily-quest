'use client'
import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '@/lib/constants';
import type { ChallengeSettings, KanjiWord } from '@/lib/constants';

type CollectionWord = KanjiWord & {
  kanji_level: string;
  currentStatus?: string;
  mistakeCount?: number;
};

type CollectionScreenProps = {
    currentUser: { id: string; light: string };
    setView: (view: string) => void;
    allWordsList: CollectionWord[];
    challengeSettings: Pick<ChallengeSettings, 'unlocked_tips'> | null;
    speakWord: (text: string) => void;
    renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
    getFullReading: (reading: string, okurigana?: string | null) => string;
    stopSpeaking: () => void;
    onViewCard?: () => void;
    onSelfJudge?: (word: CollectionWord, remembered: boolean) => void;
    onRegisterMistake?: (input: { kanji: string; reading: string; note: string }) => Promise<boolean>;
    toggleArchiveStatus: (id: number, currentStatus: string) => void; // ★ 追加
};

export default function CollectionScreen(props: CollectionScreenProps) {
    const { 
        currentUser, setView, allWordsList, challengeSettings, 
        speakWord, renderReading, getFullReading, stopSpeaking, onViewCard,
        onSelfJudge, onRegisterMistake, toggleArchiveStatus // ★ 追加
    } = props;
    
    // ★ 'archived' タブを追加
    const [mainTab, setMainTab] = useState<'words'|'tips'|'archived'>('words');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tipSearchQuery, setTipSearchQuery] = useState('');
    const [isMistakeFormOpen, setIsMistakeFormOpen] = useState(false);
    const [isSavingMistake, setIsSavingMistake] = useState(false);
    const [mistakeForm, setMistakeForm] = useState({ kanji: '', reading: '', note: '' });
    const [flashcardMode, setFlashcardMode] = useState<'normal'|'hide_kanji'|'hide_reading'>('normal');
    
    // グリッドでのクイズ表示用に保持
    const [revealedCards, setRevealedCards] = useState<number[]>([]);
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
    // フラッシュカードの現在地インデックス
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const unlockedTips = challengeSettings?.unlocked_tips || [];
    const filteredTips = unlockedTips
      .map((tip, index) => ({ tip, index }))
      .filter(({ tip }) => tip.toLocaleLowerCase().includes(tipSearchQuery.trim().toLocaleLowerCase()));

    const categoryStats = useMemo(() => {
        const standardCategories = CATEGORIES.map(cat => {
            const words = allWordsList.filter(w => w.kanji_level === cat.id);
            const [total] = [words.length];
            const mastered = words.filter(w => w.currentStatus === 'gold').length;
            return { ...cat, total, mastered };
        });
        const mistakeWords = allWordsList.filter(w => (w.mistakeCount || 0) > 0);
        const hardWords = allWordsList.filter(w => (w.mistakeCount || 0) >= 2);
        return [
          ...standardCategories,
          {
            id: 'mistakes',
            name: currentUser.id === 'brother' ? 'タクマが間違えた漢字' : '間違えた漢字',
            total: mistakeWords.length,
            mastered: mistakeWords.filter(w => w.currentStatus === 'gold').length
          },
          {
            id: 'hard',
            name: '覚えにくい漢字',
            total: hardWords.length,
            mastered: hardWords.filter(w => w.currentStatus === 'gold').length
          }
        ];
      }, [allWordsList, currentUser.id]);

    const filteredWords = useMemo(() => {
        return allWordsList.filter(w => {
            // ★ アーカイブタブの処理
            if (mainTab === 'archived') {
                if (w.currentStatus !== 'archived') return false;
            } 
            // ★ 通常のずかんタブからはアーカイブを除外
            else if (mainTab === 'words') {
                if (w.currentStatus === 'archived') return false; 
                if (selectedCategory === 'mistakes' && !((w.mistakeCount || 0) > 0)) return false;
                if (selectedCategory === 'hard' && !((w.mistakeCount || 0) >= 2)) return false;
                if (selectedCategory !== 'mistakes' && selectedCategory !== 'hard' && w.kanji_level !== selectedCategory) return false;
            }

            if (searchQuery && !w.kanji.includes(searchQuery) && !w.reading.includes(searchQuery)) return false;
            return true;
        });
    }, [allWordsList, selectedCategory, searchQuery, mainTab]); // ★ mainTab を依存配列に追加

    // グリッドのタップ時の挙動（クイズ表示を解除 ＆ フラッシュカードを開く）
    const handleCardClick = (w: CollectionWord, index: number) => {
      const wasRevealed = revealedCards.includes(w.id);
      if (!wasRevealed) {
            setRevealedCards([...revealedCards, w.id]);
        }
      setIsAnswerRevealed(wasRevealed);
        if (onViewCard) onViewCard();
        setSelectedIndex(index);
    };

    const handleMistakeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!onRegisterMistake || isSavingMistake) return;
      setIsSavingMistake(true);
      try {
        const registered = await onRegisterMistake(mistakeForm);
        if (registered) {
          setMistakeForm({ kanji: '', reading: '', note: '' });
          setIsMistakeFormOpen(false);
          setSelectedCategory('mistakes');
          setMainTab('words');
        }
      } finally {
        setIsSavingMistake(false);
      }
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
                {mainTab === 'words' ? '📖 言葉の図鑑' : mainTab === 'tips' ? '🎁 たからもの' : '📦 アーカイブ'}
              </h2>
            </div>

            <div className="flex p-1 bg-stone-200/50 rounded-2xl mb-6">
                <button 
                    onClick={() => { setMainTab('words'); setSelectedCategory(null); }} 
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
                {/* ★ アーカイブタブの追加 */}
                <button 
                    onClick={() => { setMainTab('archived'); setSelectedCategory(null); }} 
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${mainTab === 'archived' ? 'bg-stone-700 text-stone-100 shadow-md' : 'text-stone-500'}`}
                >
                    📦 アーカイブ
                </button>
            </div>

            {mainTab === 'words' && (
              <>
                {!selectedCategory ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                        {currentUser.id === 'brother' && (
                          <section className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-4 shadow-sm">
                            <button
                              type="button"
                              aria-expanded={isMistakeFormOpen}
                              onClick={() => setIsMistakeFormOpen(open => !open)}
                              className="flex w-full items-center justify-between gap-3 text-left"
                            >
                              <span>
                                <span className="block text-base font-black text-rose-700">✍️ 間違えた漢字を登録</span>
                                <span className="mt-1 block text-xs font-bold text-rose-600">別の学習帳で間違えた漢字を追加できます</span>
                              </span>
                              <span className="shrink-0 text-xl font-black text-rose-500">{isMistakeFormOpen ? '−' : '＋'}</span>
                            </button>
                            {isMistakeFormOpen && (
                              <form onSubmit={handleMistakeSubmit} className="mt-4 space-y-3 border-t border-rose-200 pt-4">
                                <input
                                  required
                                  maxLength={20}
                                  value={mistakeForm.kanji}
                                  onChange={event => setMistakeForm(form => ({ ...form, kanji: event.target.value }))}
                                  placeholder="漢字（必須）"
                                  aria-label="間違えた漢字"
                                  className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-xl font-black text-stone-800 outline-none focus:border-rose-400"
                                />
                                <input
                                  required
                                  maxLength={40}
                                  value={mistakeForm.reading}
                                  onChange={event => setMistakeForm(form => ({ ...form, reading: event.target.value }))}
                                  placeholder="読み（必須）"
                                  aria-label="漢字の読み"
                                  className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 font-bold text-stone-700 outline-none focus:border-rose-400"
                                />
                                <textarea
                                  maxLength={200}
                                  value={mistakeForm.note}
                                  onChange={event => setMistakeForm(form => ({ ...form, note: event.target.value }))}
                                  placeholder="問題文や覚え方のメモ（任意）"
                                  aria-label="問題文や覚え方のメモ"
                                  rows={2}
                                  className="w-full resize-y rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 outline-none focus:border-rose-400"
                                />
                                <button
                                  type="submit"
                                  disabled={isSavingMistake}
                                  className="w-full rounded-xl bg-rose-600 px-4 py-3 font-black text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
                                >
                                  {isSavingMistake ? '登録中...' : '登録して間違いリストを見る'}
                                </button>
                              </form>
                            )}
                          </section>
                        )}
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
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm">
                  <input
                    type="search"
                    value={tipSearchQuery}
                    onChange={(event) => setTipSearchQuery(event.target.value)}
                    placeholder="豆知識をキーワードで検索..."
                    aria-label="豆知識を検索"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base font-bold text-stone-700 outline-none focus:border-amber-400"
                  />
                  <p className="px-1 pt-2 text-xs font-bold text-stone-500">{filteredTips.length} / {unlockedTips.length} 件</p>
                </div>
                {filteredTips.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredTips.map(({ tip, index }) => (
                      <article key={`${index}-${tip}`} className="rounded-2xl border border-amber-200 bg-[#fdf6e3] p-4 shadow-sm sm:p-5">
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 text-2xl" aria-hidden="true">📜</span>
                          <p className="min-w-0 flex-1 break-words text-base font-bold leading-relaxed text-amber-950">{tip}</p>
                        </div>
                        <p className="mt-3 text-right text-[10px] font-black text-amber-800/50">豆知識 #{index + 1}</p>
                      </article>
                    ))}
                  </div>
                ) : unlockedTips.length > 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
                    <p className="text-3xl mb-2">🔎</p>
                    <p className="font-bold text-stone-500">一致する豆知識がありません</p>
                  </div>
                ) : (
                        <div className="bg-white/50 border-4 border-dashed border-stone-200 rounded-[3rem] p-16 text-center">
                            <p className="text-6xl mb-6 grayscale opacity-30">📦</p>
                            <p className="text-stone-400 font-black">まだお宝がありません。<br/>冒険（10分学習）をして<br/>宝箱をみつけよう！</p>
                        </div>
                    )}
                </div>
            )}

            {/* ★ アーカイブ一覧の表示 */}
            {mainTab === 'archived' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    {filteredWords.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3">
                          {filteredWords.map((w, index) => (
                            <div key={w.id} onClick={() => handleCardClick(w, index)} className="bg-stone-100 rounded-[2rem] p-3 border-b-4 border-stone-300 shadow-inner flex flex-col items-center justify-center relative aspect-square cursor-pointer active:scale-95 transition-transform overflow-hidden grayscale hover:grayscale-0">
                              <div className="text-2xl mb-1">{w.emoji}</div>
                              <div className="relative w-full text-center">
                                <span className="text-3xl font-black text-stone-400 block truncate">{w.kanji}</span>
                              </div>
                              <div className="relative mt-2 w-full text-center">
                                <span className="text-[10px] font-bold text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full inline-block truncate max-w-full">{w.reading}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                    ) : (
                        <div className="bg-white/50 border-4 border-dashed border-stone-200 rounded-[3rem] p-16 text-center">
                            <p className="text-6xl mb-6 grayscale opacity-30">📦</p>
                            <p className="text-stone-400 font-black">アーカイブされた漢字はありません。</p>
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* ==========================================
              ★ タスク 3: 巨大フラッシュカード化
             ========================================== */}
          {selectedIndex !== null && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 bg-stone-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedIndex(null)}>
              <div className="bg-white w-[min(88vw,42rem)] max-w-2xl max-h-[72dvh] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[2rem] sm:rounded-[3rem] p-4 pt-14 sm:p-8 sm:pt-16 relative flex flex-col items-center justify-start shadow-2xl animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                
                <button onClick={() => setSelectedIndex(null)} className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:text-stone-700 text-2xl font-black" aria-label="閉じる">✖</button>
                
                <div className="flex items-center justify-between w-full mt-4">
                  {/* ◀ 前へ */}
                  <button 
                    onClick={() => {
                      setSelectedIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
                      setIsAnswerRevealed(false);
                    }}
                    disabled={selectedIndex === 0}
                    className={`shrink-0 text-3xl sm:text-6xl transition-all p-1 sm:p-4 ${selectedIndex === 0 ? 'text-stone-200 cursor-not-allowed' : 'text-sky-500 active:scale-90 hover:text-sky-600'}`}
                  >◀</button>

                  {/* 巨大な漢字と読み表示 */}
                    <div className="min-w-0 flex-1 text-center px-1 sm:px-4 flex flex-col items-center animate-in zoom-in duration-300" key={selectedIndex}>
                    <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">{filteredWords[selectedIndex].emoji}</div>
                    <h2 className="text-6xl sm:text-[8rem] md:text-[10rem] font-black text-stone-800 leading-none mb-4 sm:mb-6 drop-shadow-md">
                      {flashcardMode === 'hide_kanji' && !isAnswerRevealed ? '？' : filteredWords[selectedIndex].kanji}
                    </h2>
                    <div className="flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-4 bg-sky-50 py-3 px-3 sm:px-8 rounded-full border-4 border-sky-100 shadow-sm">
                      <p className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight text-sky-700">
                        {flashcardMode === 'hide_reading' && !isAnswerRevealed ? '？？？' : renderReading(filteredWords[selectedIndex].reading, filteredWords[selectedIndex].okurigana)}
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

                    {/* ★ アーカイブの切り替えボタン */}
                    <button 
                      onClick={() => {
                        toggleArchiveStatus(filteredWords[selectedIndex].id, filteredWords[selectedIndex].currentStatus || 'learning');
                        setSelectedIndex(null);
                      }}
                      className="mt-6 bg-stone-100 hover:bg-stone-200 text-stone-500 font-black py-3 px-6 rounded-xl transition-colors shadow-sm text-sm border-2 border-stone-200"
                    >
                      {filteredWords[selectedIndex].currentStatus === 'archived' ? '✨ アーカイブから戻す' : '📦 この漢字をアーカイブする'}
                    </button>

                    {flashcardMode !== 'normal' && !isAnswerRevealed && (
                      <button
                        onClick={() => setIsAnswerRevealed(true)}
                        className="mt-5 rounded-2xl bg-sky-600 px-8 py-3 text-sm font-black text-white shadow-md transition active:scale-95"
                      >
                        答えを見る
                      </button>
                    )}
                    <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3">
                      <button
                        onClick={() => onSelfJudge?.(filteredWords[selectedIndex], false)}
                        disabled={flashcardMode !== 'normal' && !isAnswerRevealed}
                        className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-4 text-sm font-black text-rose-600 transition active:scale-95 disabled:opacity-40"
                      >
                        まだ不安
                      </button>
                      <button
                        onClick={() => onSelfJudge?.(filteredWords[selectedIndex], true)}
                        disabled={flashcardMode !== 'normal' && !isAnswerRevealed}
                        className="rounded-2xl border-2 border-emerald-500 bg-emerald-500 px-4 py-4 text-sm font-black text-white shadow-md transition active:scale-95 disabled:opacity-40"
                      >
                        覚えた！
                      </button>
                    </div>
                  </div>

                  {/* 次へ ▶ */}
                  <button 
                    onClick={() => {
                      setSelectedIndex(prev => (prev !== null && prev < filteredWords.length - 1 ? prev + 1 : prev));
                      setIsAnswerRevealed(false);
                    }}
                    disabled={selectedIndex === filteredWords.length - 1}
                    className={`shrink-0 text-3xl sm:text-6xl transition-all p-1 sm:p-4 ${selectedIndex === filteredWords.length - 1 ? 'text-stone-200 cursor-not-allowed' : 'text-sky-500 active:scale-90 hover:text-sky-600'}`}
                  >▶</button>
                </div>
                
                <p className="mt-6 text-stone-400 font-bold tracking-widest">
                  {selectedIndex + 1} / {filteredWords.length}
                </p>
              </div>
            </div>
          )}
        </div>
    );
}