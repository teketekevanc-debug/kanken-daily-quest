// components/AdminScreen.tsx
'use client'
import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { USERS, CATEGORIES, getUserFirstName } from '@/lib/constants'

const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

type AdminScreenProps = {
  currentUser: any;
  setView: (view: string) => void;
  adminTargetUser: any;
  setAdminTargetUser: (user: any) => void;
  fetchAdminStats: (user: any) => void;
  fetchAllWordsForEdit: () => void;
  stats: any;
  editStreak: number;
  setEditStreak: (num: number) => void;
  handleSaveStreak: () => void;
  handleAddWord: (newWordData: any, isMistake: boolean) => void; 
  handleUpdateWord: (id: number, updatedData: any) => void;
  allWordsList: any[];
  toggleMasterStatus: (id: number, currentStatus: string) => void;
  handleDeleteWord: (id: number) => void;
  monthlyLogs: any[];
  selectedLogDate: string | null;
  setSelectedLogDate: (date: string | null) => void;
  renderCalendar: () => React.ReactNode;
}

export default function AdminScreen(props: AdminScreenProps) {
  const {
    setView, adminTargetUser, setAdminTargetUser, fetchAdminStats,
    fetchAllWordsForEdit, stats, editStreak, setEditStreak,
    handleSaveStreak, handleAddWord, handleUpdateWord, allWordsList, toggleMasterStatus,
    handleDeleteWord, monthlyLogs, selectedLogDate, setSelectedLogDate, renderCalendar
  } = props;

  const [adminTab, setAdminTab] = useState<'stats' | 'add_word' | 'manage'>('stats');
  
  // 新しいカテゴリのデフォルト値を設定
  const defaultCategory = CATEGORIES.find(c => c.id.startsWith('v2_'))?.id || CATEGORIES[0]?.id;
  const [newWord, setNewWord] = useState({ kanji: '', reading: '', okurigana: '', usage_example: '', origin_logic: '', category: defaultCategory });
  const [isMistakeInitial, setIsMistakeInitial] = useState(false);

  const [manageSearchQuery, setManageSearchQuery] = useState('');
  const [manageCategory, setManageCategory] = useState('all'); // ★追加: 管理画面用のカテゴリ絞り込み
  const [editingWord, setEditingWord] = useState<any>(null);

  const matchingLogs = selectedLogDate ? monthlyLogs.filter(l => l.date === selectedLogDate) : [];
  const [selectedLog] = matchingLogs;
  const [rTopL, rTopR, rBotR, rBotL] = BAR_RADIUS;

  const onAddWordClick = () => {
    if (!newWord.kanji || !newWord.reading) {
      alert("漢字と読みは必須です。");
      return;
    }
    handleAddWord(newWord, isMistakeInitial); 
    setNewWord({ kanji: '', reading: '', okurigana: '', usage_example: '', origin_logic: '', category: defaultCategory });
    setIsMistakeInitial(false); 
  };

  // ★変更: カテゴリ絞り込みとテキスト検索の両方を適用
  const filteredManageWords = allWordsList.filter(w => {
    if (manageCategory !== 'all' && w.kanji_level !== manageCategory) return false;
    if (manageSearchQuery && !w.kanji.includes(manageSearchQuery) && !w.reading.includes(manageSearchQuery) && !(w.usage_example && w.usage_example.includes(manageSearchQuery))) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-100 font-sans p-4 md:p-8 pb-24 text-center">
      
      {/* ログ詳細モーダル */}
      {selectedLogDate && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedLogDate(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-xl mb-4 text-stone-800">{selectedLogDate} の記録</h3>

            <div className="overflow-y-auto flex-1 mb-4 space-y-2 pr-1 no-scrollbar">
              {selectedLog?.details?.length ? (
                selectedLog.details.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <span className="font-black text-stone-700 flex-1 text-left text-lg">{d.word}</span>
                    <span className="text-xs font-bold text-stone-400 mx-2">⏱️ {d.timeSpent || 0}秒</span>
                    <span className="text-xl w-8 text-right">{d.result === 'correct' ? '⭕' : '❌'}</span>
                  </div>
                ))
              ) : (
                <p className="text-stone-400 font-bold py-4 text-center">学習データなし</p>
              )}
            </div>

            <button onClick={() => setSelectedLogDate(null)} className="w-full bg-stone-800 text-white font-black py-4 rounded-xl shadow-sm active:scale-95 transition-all">
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editingWord && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditingWord(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl relative text-left" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-stone-700 mb-4 text-lg">📝 言葉の編集</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input className="border border-stone-300 p-3 rounded-lg font-black text-xl outline-none focus:border-stone-500 bg-white text-stone-800" placeholder="漢字" value={editingWord.kanji} onChange={e => setEditingWord({...editingWord, kanji: e.target.value})} />
                <input className="border border-stone-300 p-3 rounded-lg font-bold outline-none focus:border-stone-500 bg-white text-stone-800" placeholder="読み" value={editingWord.reading} onChange={e => setEditingWord({...editingWord, reading: e.target.value})} />
              </div>
              <select className="w-full border border-stone-300 p-3 rounded-lg font-bold bg-white outline-none focus:border-stone-500 text-stone-800" value={editingWord.kanji_level} onChange={e => setEditingWord({...editingWord, kanji_level: e.target.value})}>
                {CATEGORIES.map((c: any) => <option key={c.id} value={c.id} className="text-stone-800">{c.name}</option>)}
              </select>
              <textarea className="w-full border border-stone-300 p-3 rounded-lg font-bold outline-none focus:border-stone-500 bg-white min-h-[80px] text-stone-800" placeholder="例文（任意）" value={editingWord.usage_example || ''} onChange={e => setEditingWord({...editingWord, usage_example: e.target.value})} />
              <textarea className="w-full border border-stone-300 p-3 rounded-lg font-bold outline-none focus:border-stone-500 bg-white min-h-[80px] text-stone-800" placeholder="なりたち・解説（任意）" value={editingWord.origin_logic || ''} onChange={e => setEditingWord({...editingWord, origin_logic: e.target.value})} />
              
              <div className="flex gap-2 mt-4">
                <button onClick={() => setEditingWord(null)} className="flex-1 bg-stone-100 text-stone-600 py-3 rounded-lg font-black shadow-sm border border-stone-200">キャンセル</button>
                <button 
                  onClick={() => {
                    handleUpdateWord(editingWord.id, {
                      kanji: editingWord.kanji,
                      reading: editingWord.reading,
                      kanji_level: editingWord.kanji_level,
                      usage_example: editingWord.usage_example,
                      origin_logic: editingWord.origin_logic
                    });
                    setEditingWord(null);
                  }} 
                  className="flex-1 bg-stone-800 text-white py-3 rounded-lg font-black shadow-sm"
                >
                  保存する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setView('menu')} className="text-stone-600 font-bold bg-white px-5 py-2 rounded-md shadow-sm border border-stone-200 hover:bg-stone-50 transition active:scale-95">← メニューへ</button>
          <h2 className="text-xl font-black text-stone-800">保護者管理</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {USERS.map((u: any) => (
            <button key={u.id} onClick={() => { setAdminTargetUser(u); fetchAdminStats(u); }} className={`px-4 py-2 rounded-md text-sm font-black transition-all shadow-sm border ${adminTargetUser.id === u.id ? 'bg-stone-800 text-white border-stone-900' : 'bg-white text-stone-400 border-stone-200 hover:bg-stone-50'}`}>
              {u.name}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg p-1.5 mb-6 shadow-sm flex border border-stone-200">
          <button onClick={() => setAdminTab('stats')} className={`flex-1 py-2 text-sm font-black rounded-md transition-all ${adminTab === 'stats' ? 'bg-stone-100 text-stone-800' : 'text-stone-400 hover:bg-stone-50'}`}>📊 成績・記録</button>
          <button onClick={() => setAdminTab('add_word')} className={`flex-1 py-2 text-sm font-black rounded-md transition-all ${adminTab === 'add_word' ? 'bg-stone-100 text-stone-800' : 'text-stone-400 hover:bg-stone-50'}`}>➕ 単語の追加</button>
          <button onClick={() => { setAdminTab('manage'); fetchAllWordsForEdit(); }} className={`flex-1 py-2 text-sm font-black rounded-md transition-all ${adminTab === 'manage' ? 'bg-stone-100 text-stone-800' : 'text-stone-400 hover:bg-stone-50'}`}>📝 編集・削除</button>
        </div>

        <div className="space-y-6">
          {adminTab === 'stats' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 学習サマリー */}
                <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm text-left">
                  <h3 className="font-black text-stone-700 mb-2 border-b border-stone-100 pb-2">🕒 今日の学習状況</h3>
                  <div className="flex items-end justify-between mt-4">
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 mb-1">学習時間</p>
                      {(() => {
                        const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
                        const matching = (stats?.recentLogs || []).filter((l: any) => l.date === todayStr);
                        const studySeconds = matching[0]?.study_time_seconds || 0;
                        return <p className="text-2xl font-black text-stone-800">{Math.floor(studySeconds / 60)} <span className="text-xs">分</span></p>;
                      })()}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-stone-400 mb-1">ドリル進捗</p>
                      {(() => {
                        const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
                        const matching = (stats?.recentLogs || []).filter((l: any) => l.date === todayStr);
                        return <p className="text-xl font-black text-stone-700">{matching[0]?.count || 0} 問</p>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* 苦手ワースト */}
                <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm text-left flex flex-col">
                  <h3 className="font-black text-rose-700 mb-3 border-b border-stone-100 pb-2">🔥 苦手ワースト（全体）</h3>
                  <ul className="space-y-2 overflow-y-auto flex-1 pr-1 no-scrollbar max-h-32">
                    {(stats?.weakWords || []).slice(0, 5).map((w: any, i: number) => (
                      <li key={i} className="flex justify-between items-center text-sm border-b border-stone-50 pb-1">
                        <div className="font-bold text-stone-700 truncate mr-2 flex-1">
                          {w.word} <span className="text-[10px] text-stone-400 font-normal">({w.meaning})</span>
                        </div>
                        <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-xs font-black shrink-0">{w.mistakes}回</span>
                      </li>
                    ))}
                    {(stats?.weakWords?.length === 0) && <li className="text-stone-400 text-xs font-bold">該当なし</li>}
                  </ul>
                </div>
              </div> 

              {/* グラフ */}
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm text-left">
                 <h3 className="font-black text-stone-700 mb-4">📊 30日間の学習回数推移</h3>
                 <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.graphData || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f5f5f4'}} contentStyle={{borderRadius: '8px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="count" fill="#44403c" radius={[rTopL, rTopR, rBotR, rBotL]} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* カレンダー */}
              <div className="mt-4">
                {renderCalendar()}
              </div>

              {/* データ手動修正 */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-4 text-left flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500">連続記録の手動修正:</span>
                <div className="flex gap-2">
                  <input type="number" className="w-16 p-1 text-center border border-stone-300 rounded font-bold text-stone-800" value={editStreak} onChange={e => setEditStreak(parseInt(e.target.value) || 0)} />
                  <button onClick={handleSaveStreak} className="bg-stone-300 text-stone-700 text-xs font-bold px-3 py-1 rounded active:scale-95">保存</button>
                </div>
              </div>

            </div>
          )}

          {adminTab === 'add_word' && (
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-left animate-in fade-in slide-in-from-bottom-2">
              <h3 className="font-black text-stone-700 mb-4 border-b border-stone-100 pb-2">➕ 新しい漢字・熟語の登録</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input className="border border-stone-300 p-3 rounded-lg font-black text-xl outline-none focus:border-stone-500 bg-white text-stone-800" placeholder="漢字（必須）" value={newWord.kanji} onChange={e => setNewWord({...newWord, kanji: e.target.value})} />
                  <input className="border border-stone-300 p-3 rounded-lg font-bold outline-none focus:border-stone-500 bg-white text-stone-800" placeholder="読み（必須）" value={newWord.reading} onChange={e => setNewWord({...newWord, reading: e.target.value})} />
                </div>
                
                <p className="text-xs font-bold text-stone-500 mt-2 mb-1">カテゴリ（【新】の分類を選んでください）</p>
                <select className="w-full border border-stone-300 p-3 rounded-lg font-bold bg-white outline-none focus:border-stone-500 text-stone-800 appearance-none" value={newWord.category} onChange={e => setNewWord({...newWord, category: e.target.value})}>
                  {CATEGORIES.map((c: any) => <option key={c.id} value={c.id} className="text-stone-800">{c.name}</option>)}
                </select>
                
                <textarea className="w-full border border-stone-300 p-3 rounded-lg font-bold outline-none focus:border-stone-500 bg-white min-h-[80px] text-stone-800" placeholder="例文（任意）" value={newWord.usage_example} onChange={e => setNewWord({...newWord, usage_example: e.target.value})} />
                <textarea className="w-full border border-stone-300 p-3 rounded-lg font-bold outline-none focus:border-stone-500 bg-white min-h-[80px] text-stone-800" placeholder="なりたち・解説（任意）" value={newWord.origin_logic} onChange={e => setNewWord({...newWord, origin_logic: e.target.value})} />
                
                <label className="flex items-center gap-2 font-bold text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-200 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isMistakeInitial} 
                    onChange={e => setIsMistakeInitial(e.target.checked)} 
                    className="w-4 h-4 accent-stone-800"
                  />
                  <span className="text-sm">🔥 登録と同時に「1回ミス扱い」にして復習に出やすくする</span>
                </label>

                <button onClick={onAddWordClick} className="w-full bg-stone-800 text-white py-4 rounded-lg font-black text-lg shadow-sm active:scale-95 transition hover:bg-stone-700">登録する</button>
              </div>
            </div>
          )}

          {adminTab === 'manage' && (
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm text-left animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-stone-700 border-b border-stone-100 pb-2 flex-1">📝 登録データ管理</h3>
                  <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded">全 {allWordsList.length} 件</span>
                </div>
                
                {/* ★ 変更: カテゴリ絞り込み用のセレクトボックスを追加 */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select 
                    value={manageCategory} 
                    onChange={e => setManageCategory(e.target.value)} 
                    className="w-full sm:w-1/3 border border-stone-300 rounded-lg p-2.5 font-bold bg-white outline-none focus:border-stone-500 text-sm text-stone-800 appearance-none"
                  >
                    <option value="all" className="text-stone-800">すべてのカテゴリ</option>
                    {CATEGORIES.map((c: any) => <option key={c.id} value={c.id} className="text-stone-800">{c.name}</option>)}
                  </select>
                  
                  <input 
                    type="text" 
                    placeholder="漢字・読み・例文で検索..." 
                    value={manageSearchQuery}
                    onChange={(e) => setManageSearchQuery(e.target.value)}
                    className="w-full sm:w-2/3 border border-stone-300 rounded-lg p-2.5 font-bold bg-white outline-none focus:border-stone-500 text-sm text-stone-800"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                {filteredManageWords.length > 0 ? filteredManageWords.map((w: any) => {
                  const category = CATEGORIES.find((c: any) => c.id === w.kanji_level);
                  const displayName = category?.name?.replace('【新】', '').replace('【旧】', '') || w.kanji_level;
                  
                  return (
                    <div key={w.id} className="bg-stone-50 rounded-lg p-3 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1 min-w-0 text-left">
                           <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`font-black text-lg ${w.currentStatus === 'archived' ? 'text-stone-400 line-through' : 'text-stone-800'}`}>{w.kanji}</span>
                              <span className="text-[9px] px-1.5 py-0.5 bg-white border border-stone-200 rounded text-stone-500 font-bold">{displayName}</span>
                              {w.currentStatus === 'archived' && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-stone-300 text-stone-700 rounded font-bold">📦 アーカイブ</span>
                              )}
                              {w.mistakeCount > 0 && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded font-black">🔥 ミス {w.mistakeCount}回</span>
                              )}
                           </div>
                           <p className="text-xs font-bold text-stone-500 truncate">{w.reading}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                         <button onClick={() => toggleMasterStatus(w.id, w.currentStatus)} className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all border ${w.currentStatus === 'gold' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white text-stone-400 border-stone-200 hover:bg-stone-100'}`}>
                           {w.currentStatus === 'gold' ? '解除' : '習得済にする'}
                         </button>
                         <button onClick={() => setEditingWord(w)} className="bg-white text-stone-600 px-3 py-1.5 rounded-md border border-stone-200 hover:bg-stone-100 transition-all font-bold text-[10px]">編集</button>
                         <button onClick={() => handleDeleteWord(w.id)} className="bg-white text-rose-500 px-3 py-1.5 rounded-md border border-rose-200 hover:bg-rose-50 transition-all font-bold text-[10px]">削除</button>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="text-center py-10 text-stone-400 font-bold text-sm">見つかりませんでした</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}