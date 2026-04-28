"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Trivia = {
  id: string;
  trivia_id: string;
  category: string;
  title: string;
  content: string;
  unlocked_at: string;
};

const CATEGORIES = ["すべて", "サバイバル", "建築", "裏技", "Mob", "レッドストーン"];

export default function ArchivePage() {
  const [collection, setCollection] = useState<Trivia[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("すべて");

  useEffect(() => {
    const fetchTrivia = async () => {
      const { data } = await supabase.from('trivia_collection').select('*').order('unlocked_at', { ascending: false });
      if (data) setCollection(data);
    };
    void fetchTrivia();
  }, []);

  const filteredCollection = collection.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "すべて" || t.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-mono p-3 pb-24 max-w-4xl mx-auto relative">
      <Link href="/" className="fixed top-4 left-4 text-xs bg-black/80 px-4 py-2 border-2 border-stone-500 font-bold z-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 text-white">🏠 拠点</Link>

      <header className="mb-8 pt-16 text-center">
        <h1 className="text-3xl font-black text-emerald-400 uppercase tracking-widest mb-2 border-b-4 border-emerald-700 pb-4 inline-block">📚 豆知識図鑑</h1>
        <p className="text-stone-400 font-bold text-sm">解放したマイクラの知識：{collection.length} 個</p>
      </header>

      <div className="mb-8 bg-stone-900 border-4 border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <input 
          type="text" 
          placeholder="🔎 キーワードで検索..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-full bg-black border-2 border-stone-700 p-4 text-white font-bold outline-none mb-4 focus:border-emerald-500 transition-colors"
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map(c => (
            <button 
              key={c} 
              onClick={() => setActiveCategory(c)} 
              className={`min-w-fit px-4 py-2 border-2 border-black font-black text-xs shadow-md active:translate-y-1 ${activeCategory === c ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filteredCollection.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCollection.map((t) => (
            <div key={t.id} className="bg-stone-800 border-4 border-black p-5 relative shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
              <div className="absolute top-0 right-0 bg-emerald-700 text-white text-[10px] font-black px-3 py-1 border-b-2 border-l-2 border-black">
                {t.category}
              </div>
              <h2 className="text-xl font-black text-yellow-400 mb-3 pr-16">{t.title}</h2>
              <p className="text-white text-sm font-bold leading-relaxed bg-black/40 p-4 border-2 border-stone-700 shadow-inner">{t.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-black/40 border-4 border-dashed border-stone-700">
          <p className="text-stone-500 font-bold text-lg">まだこのジャンルの知識はないぞ！<br/>クエストをクリアしてガチャを引こう！</p>
        </div>
      )}
    </div>
  );
}