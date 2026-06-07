// components/ExamListScreen.tsx
'use client'
import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '@/lib/constants';

type ExamListScreenProps = {
    currentUser: any;
    setView: (view: string) => void;
    allWordsList: any[];
    renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
    speakWord: (text: string) => void;
};

export default function ExamListScreen({ currentUser, setView, allWordsList, renderReading, speakWord }: ExamListScreenProps) {
    // デフォルトで6級を選択
    const [selectedCategory, setSelectedCategory] = useState('kyu6');

    const filteredWords = useMemo(() => {
        return allWordsList.filter(w => w.kanji_level === selectedCategory);
    }, [allWordsList, selectedCategory]);

    return (
        <div className={`min-h-screen ${currentUser.light} p-4 pb-20 font-sans`}>
            <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col h-[85vh] border-4 border-white/50">
                <div className={`${currentUser.color} p-4 text-white flex justify-between items-center shrink-0 shadow-sm`}>
                    <button onClick={() => setView('menu')} className="font-black text-xs bg-black/20 px-4 py-2 rounded-full active:scale-95 transition">← もどる</button>
                    <h2 className="font-black tracking-widest text-lg">📖 試験対策リスト</h2>
                </div>
                
                <div className="p-4 shrink-0 border-b-4 border-stone-100 bg-stone-50">
                    <p className="text-xs font-bold text-stone-400 mb-2 text-center">クイズはお休み。眺めて復習しよう！</p>
                    <select 
                        value={selectedCategory} 
                        onChange={e => setSelectedCategory(e.target.value)} 
                        className="w-full p-3 rounded-2xl bg-white border-2 border-stone-200 font-black text-stone-700 outline-none focus:border-sky-400 shadow-sm text-center"
                    >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50 no-scrollbar">
                    <p className="text-right text-[10px] font-black text-stone-400">全 {filteredWords.length} 件</p>
                    {filteredWords.length > 0 ? (
                        filteredWords.map((w, i) => (
                            <div key={w.id} className="bg-white p-4 rounded-2xl shadow-sm border-2 border-stone-100 flex items-center gap-4 hover:border-sky-200 transition-colors">
                                <div className="w-6 text-center text-stone-300 font-black text-xs shrink-0">{i + 1}</div>
                                <div className="text-5xl font-black text-stone-800 shrink-0 w-16 text-center">{w.kanji}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="text-sky-600 font-black text-lg bg-sky-50 px-3 py-0.5 rounded-lg inline-block">
                                            {renderReading(w.reading, w.okurigana)}
                                        </div>
                                        <button onClick={() => speakWord(w.okurigana ? `${w.reading}${w.okurigana}` : w.reading)} className="text-sky-400 active:scale-90 transition-transform">🔊</button>
                                    </div>
                                    {w.sentence && <p className="text-sm font-bold text-stone-600 leading-snug">{w.sentence.replace('□', w.kanji)}</p>}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <span className="text-5xl opacity-30 block mb-4">📭</span>
                            <p className="text-stone-400 font-bold">この級の漢字はまだありません。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}