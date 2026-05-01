'use client'
import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Label } from 'recharts'
import { USERS, CATEGORIES, getUserFirstName } from '@/lib/constants'

const getPieColor = (index: number) => {
  const colors = ['#E5E7EB', '#CD7F32', '#C0C0C0', '#FFD700'];
  const [c0, c1, c2, c3] = colors;
  const mod = index % 4;
  if (mod === 0) return c0;
  if (mod === 1) return c1;
  if (mod === 2) return c2;
  return c3;
};

const BAR_RADIUS = [4, 4, 0, 0];

type AdminScreenProps = {
  currentUser: any;
  setView: (view: string) => void;
  adminTargetUser: any;
  setAdminTargetUser: (user: any) => void;
  fetchAdminStats: (user: any) => void;
  fetchAllWordsForEdit: () => void;
  stats: any;
  challengeSettings: any;
  setChallengeSettings: (settings: any) => void;
  saveChallengeSettings: (settings: any) => void;
  sendLineToChild: (msg: string) => void;
  editStreak: number;
  setEditStreak: (num: number) => void;
  handleSaveStreak: () => void;
  handleAddWord: (newWordData: any) => void;
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
    fetchAllWordsForEdit, stats, challengeSettings, setChallengeSettings,
    saveChallengeSettings, sendLineToChild, editStreak, setEditStreak,
    handleSaveStreak, handleAddWord, allWordsList, toggleMasterStatus,
    handleDeleteWord, monthlyLogs, selectedLogDate, setSelectedLogDate, renderCalendar
  } = props;

  const [adminTab, setAdminTab] = useState<'stats' | 'challenge' | 'add_word' | 'manage'>('stats');
  const [showAllWeakWords, setShowAllWeakWords] = useState(false);
  const [newWord, setNewWord] = useState({ kanji: '', reading: '', okurigana: '', sentence: '', emoji: '📝', category: 'kyu10', stroke_count: '', stroke_data_url: '', usage_example: '', origin_logic: '' });

  const matchingLogs = selectedLogDate ? monthlyLogs.filter(l => l.date === selectedLogDate) : [];
  const [selectedLog] = matchingLogs;
  const [rTopL, rTopR, rBotR, rBotL] = BAR_RADIUS;

  const onAddWordClick = () => {
    handleAddWord(newWord);
    setNewWord({ kanji: '', reading: '', okurigana: '', sentence: '', emoji: '📝', category: 'kyu10', stroke_count: '', stroke_data_url: '', usage_example: '', origin_logic: '' });
  };

  const handleConsumeReward = async () => {
    const { owned_rewards: owned = 0, reward_text: rText = 'ご褒美' } = challengeSettings;
    if (owned <= 0) {
      alert("使えるストックがありません！");
      return;
    }
    if (!confirm(`「${rText}」を1つ使いますか？\n（ストックが1つ減ります）`)) return;

    const newOwned = owned - 1;
    const { supabase } = await import('@/lib/supabaseClient');
    const { error } = await supabase.from('challenge_settings').update({ owned_rewards: newOwned }).eq('target_user_id', adminTargetUser.id);
    
    if (error) {
      alert("エラーが発生しました: " + error.message);
    } else {
      setChallengeSettings({ ...challengeSettings, owned_rewards: newOwned });
      alert("ご褒美ストックを1つ消費しました！🎁");
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 font-sans text-stone-800 pb-20">
      {/* ログ詳細モーダル */}
      {selectedLogDate && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedLogDate(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-stone-800 mb-4 text-center">{selectedLogDate} の記録</h3>
            <div className="overflow-y-auto flex-1 pr-2 mb-5 no-scrollbar">
              {selectedLog?.details?.length ? (
                selectedLog.details.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-stone-100 px-2 py-1 rounded-lg font-bold">{d.mode}</span>
                      <span className="font-black text-sm">{d.word}</span>
                    </div>
                    <span>{d.result === 'correct' ? '⭕' : d.result === 'done' ? '✓' : '❌'}</span>
                  </div>
                ))
              ) : <p className="text-center text-stone-400 py-6">データなし</p>}
            </div>
            <button onClick={() => setSelectedLogDate(null)} className="w-full bg-stone-800 text-white font-black py-4 rounded-xl shadow-lg">閉じる</button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setView('menu')} className="text-stone-500 font-bold bg-white px-6 py-2 rounded-full shadow-sm hover:bg-stone-50 transition">← もどる</button>
          <h2 className="text-2xl font-black text-stone-700">保護者メニュー</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {USERS.map((u: any) => (
            <button key={u.id} onClick={() => { setAdminTargetUser(u); fetchAdminStats(u); }} className={`px-5 py-2.5 rounded-full text-sm font-black transition-all shadow-sm ${adminTargetUser.id === u.id ? `bg-gradient-to-r ${u.hue} text-white scale-105 shadow-md` : 'bg-white text-stone-400 hover:bg-stone-50'}`}>
              {u.name}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-2 mb-8 shadow-md flex border-2 border-stone-200">
          <button onClick={() => setAdminTab('stats')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${adminTab === 'stats' ? 'bg-orange-100 text-orange-700 shadow-inner' : 'text-stone-400'}`}>📊 成績</button>
          <button onClick={() => { setAdminTab('challenge'); fetchAllWordsForEdit(); }} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${adminTab === 'challenge' ? 'bg-rose-100 text-rose-700 shadow-inner' : 'text-stone-400'}`}>⚔️ 挑戦状</button>
          <button onClick={() => setAdminTab('add_word')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${adminTab === 'add_word' ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'text-stone-400'}`}>➕ 追加</button>
          <button onClick={() => { setAdminTab('manage'); fetchAllWordsForEdit(); }} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${adminTab === 'manage' ? 'bg-slate-100 text-slate-700 shadow-inner' : 'text-stone-400'}`}>📝 編集</button>
        </div>

        <div className="space-y-6">
          {adminTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 p-6 rounded-[2rem] border-2 border-orange-100 shadow-sm md:col-span-2 text-left">
                  <h3 className="font-black text-orange-700 mb-2 flex items-center gap-2">🕒 今日の学習状況</h3>
                  <div className="flex items-end justify-between">
                    <div>
                      {(() => {
                        const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
                        const matching = (stats?.recentLogs || []).filter((l: any) => l.date === todayStr);
                        const [todayLog] = matching;
                        const studySeconds = todayLog?.study_time_seconds || 0;
                        const remainingSeconds = Math.max(0, 600 - studySeconds);
                        const remainingMinutes = Math.ceil(remainingSeconds / 60);

                        return (
                          <>
                            <p className="text-3xl font-black text-orange-600">
                              {Math.floor(studySeconds / 60)} <span className="text-sm">分</span> {studySeconds % 60} <span className="text-sm">秒</span>
                            </p>
                            <p className="text-xs font-bold text-stone-500 mt-1">
                              {remainingSeconds > 0 
                                ? `ご褒美まで、あと約 ${remainingMinutes}分 の学習が必要です。` 
                                : "✅ ご褒美ライン（10分）を突破しています！"}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-stone-400">今日の正解数</p>
                      {(() => {
                        const [latestLog] = stats?.recentLogs || [];
                        const tParts = new Date().toISOString().split('T');
                        const [todayIso] = tParts;
                        const isToday = latestLog?.date === todayIso;
                        return <p className="text-xl font-black text-stone-700">{isToday ? latestLog.count : 0} 問</p>;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-md border-2 border-stone-100 flex flex-col">
                  <h3 className="font-black text-stone-700 mb-2 flex items-center gap-2">📈 習得率</h3>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-1/2 h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats?.pieData || []} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                            {(stats?.pieData || []).map((e: any, i: number) => <Cell key={i} fill={getPieColor(i)} />)}
                            <Label value={`${Math.round(((stats?.mastered || 0) / (stats?.total || 1)) * 100) || 0}%`} position="center" className="font-black text-xl text-stone-700" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 flex flex-col gap-2 text-xs font-bold text-stone-500 ml-2">
                      {(stats?.pieData || []).map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-left">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getPieColor(index) }}></div>
                          <span className="truncate">{entry.name} ({entry.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-md border-2 border-stone-100 flex flex-col">
                  <h3 className="font-black text-stone-700 mb-4 flex items-center gap-2">🔥 苦手ワースト</h3>
                  <ul className="space-y-3 overflow-y-auto flex-1 pr-2 no-scrollbar max-h-40">
                    {(stats?.weakWords || []).slice(0, showAllWeakWords ? undefined : 5).map((w: any, i: number) => (
                      <li key={i} className="flex justify-between items-center text-sm border-b border-stone-100 pb-2 text-left">
                        <div className="font-bold text-stone-800 truncate mr-2 flex-1">
                          {i+1}. {w.word} <span className="text-[10px] text-stone-400 font-normal">({w.meaning})</span>
                        </div>
                        <span className="bg-rose-50 text-rose-500 px-2 py-1 rounded-lg text-xs font-black shrink-0">{w.mistakes}回</span>
                      </li>
                    ))}
                  </ul>
                  {(stats?.weakWords?.length || 0) > 5 && (
                     <button onClick={() => setShowAllWeakWords(!showAllWeakWords)} className="mt-3 text-xs font-bold text-sky-500 bg-sky-50 hover:bg-sky-100 active:scale-95 transition-all py-2 rounded-xl w-full">
                       {showAllWeakWords ? '▲ 閉じる' : 'もっと見る ▼'}
                     </button>
                  )}
                </div>
              </div> 

              <div className="bg-white p-6 rounded-[2rem] shadow-md border-2 border-stone-100 text-left">
                 <h3 className="font-black text-stone-700 mb-4 flex items-center gap-2">📊 30日間の学習推移 ({getUserFirstName(adminTargetUser.name)})</h3>
                 <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.graphData || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="count" fill={adminTargetUser.id === 'sister' ? '#0ea5e9' : adminTargetUser.id === 'mami' ? '#ec4899' : adminTargetUser.id === 'kenta' ? '#10b981' : '#f59e0b'} radius={[rTopL, rTopR, rBotR, rBotL]} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {renderCalendar()}
            </div>
          )}

          {adminTab === 'challenge' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 text-left">
              <div className="bg-yellow-50/50 p-6 rounded-[2rem] border-2 border-yellow-100 shadow-sm space-y-4">
                <h3 className="font-black text-yellow-600 flex items-center gap-2">👑 ご褒美ストック管理</h3>
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-yellow-100">
                  <div>
                    <p className="text-[10px] font-bold text-yellow-600 mb-1">現在の「{challengeSettings.reward_text || 'ご褒美'}」ストック</p>
                    <p className="text-3xl font-black text-yellow-500">{challengeSettings.owned_rewards || 0} <span className="text-sm text-yellow-600">個</span></p>
                    <p className="text-[10px] font-bold text-stone-400 mt-1">累計獲得: {challengeSettings.total_earned_rewards || 0} 個</p>
                  </div>
                  <button onClick={handleConsumeReward} className="bg-yellow-500 hover:bg-yellow-600 text-white font-black px-6 py-4 rounded-2xl shadow-md active:scale-95 transition-all">1個使う！</button>
                </div>
              </div>

              <div className="bg-rose-50/50 p-6 rounded-[2rem] border-2 border-rose-100 shadow-sm space-y-4">
                <h3 className="font-black text-rose-600 flex items-center gap-2">🎁 ご褒美の目標設定</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-rose-400 block mb-1 ml-2">目標日数 (日)</label>
                    <input type="number" className="w-full p-4 rounded-2xl border-2 border-rose-100 outline-none focus:border-rose-300 font-bold bg-white" value={challengeSettings.reward_goal_days} onChange={e => setChallengeSettings({...challengeSettings, reward_goal_days: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-xs font-black text-rose-400 block mb-1 ml-2">達成時のご褒美</label>
                    <input type="text" className="w-full p-4 rounded-2xl border-2 border-rose-100 outline-none focus:border-rose-300 font-bold bg-white" value={challengeSettings.reward_text} onChange={e => setChallengeSettings({...challengeSettings, reward_text: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/50 p-6 rounded-[2rem] border-2 border-emerald-100 shadow-sm">
                <h3 className="font-black text-emerald-700 flex items-center gap-2 mb-4">🎯 出題数の設定</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-black text-emerald-500 block mb-1 ml-2">毎日の冒険</label>
                    <input type="number" className="w-full p-4 rounded-2xl border-2 border-emerald-100 outline-none focus:border-emerald-300 font-bold bg-white" value={challengeSettings.quest_count} onChange={e => setChallengeSettings({...challengeSettings, quest_count: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-xs font-black text-emerald-500 block mb-1 ml-2">週末ボス</label>
                    <input type="number" className="w-full p-4 rounded-2xl border-2 border-emerald-100 outline-none focus:border-emerald-300 font-bold bg-white" value={challengeSettings.special_quest_count} onChange={e => setChallengeSettings({...challengeSettings, special_quest_count: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-xs font-black text-emerald-500 block mb-1 ml-2">パパ / Rick挑戦</label>
                    <input type="number" className="w-full p-4 rounded-2xl border-2 border-emerald-100 outline-none focus:border-emerald-300 font-bold bg-white" value={challengeSettings.challenge_quest_count} onChange={e => setChallengeSettings({...challengeSettings, challenge_quest_count: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/50 p-6 rounded-[2rem] border-2 border-amber-100 shadow-sm">
                <h3 className="font-black text-amber-700 mb-4">パパからの挑戦状設定</h3>
                <div className="flex gap-6 mb-6 ml-2">
                  <label className="flex items-center gap-2 font-bold text-sm cursor-pointer group">
                    <input type="radio" checked={challengeSettings.mode === 'manual'} onChange={() => setChallengeSettings({...challengeSettings, mode: 'manual'})} className="w-5 h-5 accent-amber-600" /> <span>手動で選ぶ</span>
                  </label>
                  <label className="flex items-center gap-2 font-bold text-sm cursor-pointer group">
                    <input type="radio" checked={challengeSettings.mode === 'auto'} onChange={() => setChallengeSettings({...challengeSettings, mode: 'auto'})} className="w-5 h-5 accent-amber-600" /> <span>苦手から自動</span>
                  </label>
                </div>
                <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 mb-6">
                  <p className="text-[10px] font-black text-amber-400 mb-1 ml-1">自動選択の問題数</p>
                  <select className="w-full p-2 bg-transparent outline-none font-bold text-stone-700" value={challengeSettings.auto_count} onChange={e => setChallengeSettings({...challengeSettings, auto_count: parseInt(e.target.value) || 0})}>
                    <option value="3">ワースト 3問</option>
                    <option value="5">ワースト 5問</option>
                    <option value="10">ワースト 10問</option>
                    <option value="15">ワースト 15問</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveChallengeSettings(challengeSettings)} className="flex-1 bg-rose-500 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all tracking-widest text-lg">すべての設定を保存</button>
                  <button onClick={() => sendLineToChild(`【${adminTargetUser.name}】パパから新しい挑戦状が届いたよ！🔥`)} className="bg-emerald-500 text-white font-black px-6 py-5 rounded-2xl shadow-xl active:scale-95 transition-all text-xs flex flex-col items-center justify-center gap-1"><span>LINE通知</span></button>
                </div>
              </div>

              {/* 🚑 救済措置エリア（幅を合わせるためここに移動） */}
              <div className="bg-[#1a1a1a] p-6 rounded-[2rem] shadow-2xl space-y-5 border border-white/5 text-left mt-8">
                <div className="space-y-1">
                  <h3 className="text-md font-black text-white flex items-center gap-2">🚑 救済措置（データの直接修正）</h3>
                  <p className="text-[9px] text-stone-500 font-bold ml-1">記録を直したい時に使ってください。</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white/5 p-4 rounded-[1.25rem] border border-white/5">
                    <label className="text-[10px] font-black text-stone-400 block mb-2 ml-1">現在の連続日数</label>
                    <div className="flex gap-2 items-center bg-black/40 p-1.5 rounded-xl border border-white/5">
                      <input type="number" className="flex-1 bg-transparent border-none text-white font-black text-xl px-3 outline-none" value={editStreak} onChange={e => setEditStreak(parseInt(e.target.value) || 0)} />
                      <button onClick={handleSaveStreak} className="bg-[#f97316] text-white text-[10px] font-black py-2 px-4 rounded-lg shadow-lg active:scale-95 transition-all">保存</button>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-[1.25rem] border border-white/5">
                    <label className="text-[10px] font-black text-stone-400 block mb-2 ml-1">ご褒美ストック数</label>
                    <div className="flex gap-2 items-center bg-black/40 p-1.5 rounded-xl border border-white/5">
                      <input type="number" className="flex-1 bg-transparent border-none text-white font-black text-xl px-3 outline-none" value={challengeSettings.owned_rewards || 0} onChange={e => setChallengeSettings({...challengeSettings, owned_rewards: parseInt(e.target.value) || 0})} />
                      <button onClick={() => saveChallengeSettings(challengeSettings)} className="bg-[#eab308] text-white text-[10px] font-black py-2 px-4 rounded-lg shadow-lg active:scale-95 transition-all">保存</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {adminTab === 'add_word' && (
            /* 省略：前回のコードと同じ */
            <div className="bg-white p-8 rounded-[2.5rem] shadow-md border-2 border-stone-100 text-left">
              <h3 className="font-black text-indigo-700 mb-6 text-xl">➕ 新しい言葉の登録</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <input className="border-2 border-stone-100 p-4 rounded-2xl font-black text-2xl outline-none focus:border-indigo-400 bg-stone-50 shadow-inner" placeholder="漢字" value={newWord.kanji} onChange={e => setNewWord({...newWord, kanji: e.target.value})} />
                  <input className="border-2 border-stone-100 p-4 rounded-2xl font-bold outline-none focus:border-indigo-400 bg-stone-50 shadow-inner" placeholder="読み" value={newWord.reading} onChange={e => setNewWord({...newWord, reading: e.target.value})} />
                </div>
                <select className="w-full border-2 border-stone-100 p-4 rounded-2xl font-bold bg-stone-50 outline-none focus:border-indigo-400" value={newWord.category} onChange={e => setNewWord({...newWord, category: e.target.value})}>
                  {CATEGORIES.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <textarea className="w-full border-2 border-stone-100 p-4 rounded-2xl font-bold outline-none focus:border-indigo-400 bg-stone-50 shadow-inner min-h-[120px]" placeholder="例文" value={newWord.usage_example} onChange={e => setNewWord({...newWord, usage_example: e.target.value})} />
                <button onClick={onAddWordClick} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition hover:bg-indigo-700">追加する 🐾</button>
              </div>
            </div>
          )}

          {adminTab === 'manage' && (
            /* 省略：前回のコードと同じ */
            <div className="bg-white p-6 rounded-[2rem] shadow-md border-2 border-stone-100 text-left">
              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="font-black text-slate-700 text-xl flex items-center gap-2">📝 編集・削除</h3>
                <span className="text-[10px] font-black text-stone-400 bg-stone-100 px-3 py-1 rounded-full">全 {allWordsList.length} 件</span>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                {allWordsList.map((w: any) => {
                  const category = CATEGORIES.find((c: any) => c.id === w.kanji_level);
                  const nParts = category?.name?.split('(') || [];
                  const [shortName] = nParts;
                  const displayName = shortName || w.kanji_level;
                  return (
                    <div key={w.id} className="bg-stone-50/50 rounded-2xl p-4 border-2 border-stone-50 shadow-sm flex items-center gap-4 group hover:border-sky-100 transition-all">
                      <div className="text-3xl grayscale group-hover:grayscale-0 transition-all drop-shadow-sm">{w.emoji || '📝'}</div>
                      <div className="flex-1 min-w-0 text-left">
                         <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-black text-lg text-sky-700 truncate">{w.kanji}</span>
                            <span className="text-[9px] px-2 py-0.5 bg-white border border-stone-100 rounded-lg font-black text-stone-400 uppercase tracking-tighter">{displayName}</span>
                         </div>
                         <p className="text-xs font-bold text-stone-500 truncate">{w.reading}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <button onClick={() => toggleMasterStatus(w.id, w.currentStatus)} className={`px-4 py-2 rounded-xl text-[10px] font-black shadow-sm transition-all border-b-2 active:translate-y-0.5 active:border-b-0 ${w.currentStatus === 'gold' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-white text-stone-300 border-stone-100'}`}>
                           {w.currentStatus === 'gold' ? '👑 解除' : '👑 習得'}
                         </button>
                         <button onClick={() => handleDeleteWord(w.id)} className="bg-white text-rose-400 p-2 rounded-xl border border-rose-50 hover:bg-rose-100 hover:text-rose-500 transition-all shadow-sm">削除</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}