'use client'
import React from 'react'

type GameScreenProps = {
  currentUser: any;
  view: string;
  mode: string;
  questQueue: any[];
  currentIndex: number;
  isTransitioning: boolean;
  selectedInputMode: string;
  rickMode: string;
  inputMode: string;
  langMode: string;
  gameStep: number;
  setGameStep: (step: number) => void;
  weekendPhase: number;
  bossHp: number;
  currentGameGoal: number;
  isBossAttacked: boolean;
  showRick: boolean;
  message: string;
  showHint: boolean;
  showFlashAnswer: boolean;
  mistakeCount: number;
  feedbackMsg: React.ReactNode;
  options: any[];
  userAnswer: string;
  setUserAnswer: (ans: string) => void;
  isListening: boolean;
  isDrawing: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startDrawing: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  draw: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  stopDrawing: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  clearCanvas: () => void;
  startListening: () => void;
  checkAnswer: (ans: string, isVoice?: boolean) => void;
  handleSelfJudge: (isCorrect: boolean) => void;
  nextQuestion: () => void;
  stopSpeaking: () => void;
  setView: (view: string) => void;
  renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
  speakWord: (text: string) => void;
  getFullReading: (reading: string, okurigana?: string | null) => string;
}

export default function GameScreen(props: GameScreenProps) {
  const {
    currentUser, view, mode, questQueue, currentIndex, isTransitioning,
    selectedInputMode, rickMode, inputMode, langMode, gameStep, setGameStep,
    weekendPhase, bossHp, currentGameGoal, isBossAttacked, showRick, message,
    showHint, showFlashAnswer, mistakeCount, feedbackMsg, options,
    userAnswer, setUserAnswer, isListening, canvasRef,
    startDrawing, draw, stopDrawing, clearCanvas, startListening,
    checkAnswer, handleSelfJudge, nextQuestion, stopSpeaking, setView,
    renderReading, speakWord, getFullReading
  } = props;

  // ★ インデックス番号でのアクセスを禁止し、分割代入で安全に取得
  const [word] = questQueue.slice(currentIndex, currentIndex + 1);

  if (!word) return null; 

  if (isTransitioning) {
    return (
      <div className={`min-h-screen ${currentUser.light} flex flex-col items-center justify-center pt-8 px-4`}>
        <div className="animate-spin text-5xl mb-4">🌀</div>
        <p className="text-stone-500 font-bold tracking-widest">Next Quest...</p>
      </div>
    );
  }
  
  const currentInputMode = view === 'rick_challenge' ? (
      rickMode === 'write' ? 'canvas' : 'self'
  ) : (
      (mode === 'weekend') ? inputMode : (
          selectedInputMode === 'write_canvas' ? 'canvas' : 
          selectedInputMode === 'write_self' ? 'self' : 
          selectedInputMode === 'typing_read' ? 'typing' : 'quiz'
      )
  );

  return (
    <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-6 px-4 font-sans pb-10`}>
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[550px] flex flex-col relative transition-all duration-300 border border-white/50">
         {mode === 'parent_challenge' && <div className="w-full bg-rose-500 text-white text-center py-1.5 text-xs font-black tracking-widest animate-pulse">🔥 パパからの挑戦状 🔥</div>}
         {mode === 'weekend' && (
           <div className="w-full bg-slate-900 text-white p-5 flex flex-col items-center relative overflow-hidden">
             <p className="text-xs font-bold text-indigo-300 mb-2 tracking-widest">Weekend Boss Battle - Round {weekendPhase}</p>
             <div className={`text-7xl mb-3 transition-transform duration-100 ${isBossAttacked ? 'scale-90 opacity-50 translate-x-1 translate-y-1' : 'animate-bounce'}`}>
               {bossHp > (currentGameGoal/2) ? '🐉' : bossHp > 0 ? '🦖' : '💥'}
             </div>
             <div className="w-full max-w-xs bg-slate-700 rounded-full h-4 border-2 border-slate-500 relative overflow-hidden">
               <div className="bg-gradient-to-r from-rose-500 to-orange-500 h-full transition-all duration-300" style={{ width: `${(bossHp / currentGameGoal) * 100}%` }}></div>
             </div>
             <p className="font-bold mt-2 text-sm text-slate-300">BOSS HP: {bossHp} / {currentGameGoal}</p>
             {isBossAttacked && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-black text-rose-500 animate-ping">BANG!</div>}
           </div>
         )}
         
        <div className={`${currentUser.color} p-4 flex justify-between items-center text-white shadow-sm`}>
          <span className="font-black tracking-widest text-sm bg-black/20 px-3 py-1 rounded-full">QUEST {currentIndex + 1} / {questQueue.length}</span>
          <button onClick={() => { stopSpeaking(); setView('menu'); }} className="text-xs font-bold opacity-80 hover:opacity-100 bg-white/20 px-3 py-1 rounded-full">にげる</button>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center relative w-full">
          {showRick && (
            <div className="absolute inset-0 bg-stone-900/60 z-20 flex flex-col items-center justify-center p-4 animate-in fade-in backdrop-blur-sm overflow-y-auto">
              <div className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl max-w-xs w-full animate-in zoom-in duration-300 border-4 border-white my-auto">
                <img src="/Rick.png" alt="Rick" className="w-24 h-24 rounded-full border-4 border-orange-400 mb-3 shadow-xl object-cover shrink-0" />
                <p className="text-xl font-black text-orange-600 mb-2 tracking-wide">{message}</p>
                <div className="mb-2 text-5xl drop-shadow-md">{word.emoji}</div>
                <div className="mb-4 relative">
                  {word.stroke_count && <span className="absolute -right-6 -top-2 text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{word.stroke_count}画</span>}
                  <p className="text-5xl font-black text-stone-800 mb-1">{word.kanji}</p>
                  <p className="text-lg font-bold text-sky-600 bg-sky-50 px-4 py-1 rounded-full inline-block">{renderReading(word.reading, word.okurigana)}</p>
                </div>
                {message.includes('正解') && word.origin_logic && (
                  <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mb-5 text-left shadow-inner shrink-0">
                    <p className="text-xs font-black text-amber-700 mb-1.5 flex items-center gap-1">💡 言葉のひみつ</p>
                    <p className="text-xs text-stone-700 font-bold leading-relaxed">{word.origin_logic}</p>
                  </div>
                )}
                <button onClick={nextQuestion} className={`${currentUser.color} text-white font-black py-4 px-10 rounded-full shadow-xl hover:scale-105 transform active:scale-95 transition tracking-widest mt-auto shrink-0`}>次へ進む 🐾</button>
              </div>
            </div>
          )}
          
          { (currentInputMode === 'quiz' || currentInputMode === 'typing') && mode !== 'weekend' && (showHint ? (
            <div className="w-28 h-28 bg-stone-100 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner animate-in zoom-in border-4 border-white">{word.emoji}</div>
          ) : (
            <div className="w-28 h-28 bg-stone-50 rounded-full flex items-center justify-center text-5xl mb-6 border-4 border-dashed border-stone-200 text-stone-300">❓</div>
          ))}
                
          {(currentInputMode === 'canvas' || currentInputMode === 'self') && (
              <div className="flex-1 w-full flex flex-col items-center">
                  <div className="text-center mb-4 w-full">
                      <p className="text-3xl font-black text-sky-600 bg-sky-50 px-5 py-2 rounded-2xl inline-block border border-sky-100">{renderReading(word.reading, word.okurigana)}</p>
                      {word.sentence && <p className="text-base font-bold text-stone-600 mt-3 bg-stone-50 py-2 rounded-xl border border-stone-200">{word.sentence.replace('□', '〇')}</p>}
                  </div>

                  {currentInputMode === 'canvas' ? (
                      <div className={`relative w-full bg-white border-4 rounded-2xl mb-4 overflow-hidden shadow-inner flex-1 min-h-[220px] transition-colors ${gameStep === 0 ? 'border-emerald-200' : 'border-stone-200'}`}>
                          {gameStep === 0 && <span className="absolute top-2 left-2 text-stone-300 font-bold text-xs pointer-events-none">ここに指で書いてね</span>}
                          <canvas ref={canvasRef} width={400} height={300} className="w-full h-full touch-none cursor-crosshair" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} style={{ touchAction: 'none' }} />
                          {gameStep === 0 && <button onClick={clearCanvas} className="absolute top-2 right-2 bg-stone-100 hover:bg-stone-200 text-stone-500 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition">🗑️ 消す</button>}
                      </div>
                  ) : (
                      <div className="relative w-full bg-stone-50 border-4 border-dashed border-stone-200 rounded-2xl mb-4 flex items-center justify-center flex-1 min-h-[220px]">
                          {gameStep === 0 ? <div className="text-center"><span className="text-6xl text-stone-300 mb-2 block">❓</span><span className="text-xs text-stone-400 font-bold">紙に書いて答え合わせしよう</span></div> : <span className="text-[6rem] font-black text-stone-800 drop-shadow-md">{word.kanji}</span>}
                      </div>
                  )}

                  {gameStep === 0 ? (
                      <button onClick={() => {
                          setGameStep(1);
                          const parts = [word.kanji, getFullReading(word.reading, word.okurigana)];
                          if (word.usage_example) parts.push(word.usage_example);
                          if (word.origin_logic) parts.push(word.origin_logic);
                          else if (word.sentence) parts.push(word.sentence);
                          speakWord(parts.join('。'));
                      }} className="w-full bg-stone-800 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition text-lg tracking-widest mt-auto shrink-0">答えを見る 👀</button>
                  ) : (
                      <div className="w-full animate-in slide-in-from-bottom flex flex-col items-center mt-auto shrink-0 overflow-y-auto max-h-48 pb-2 no-scrollbar">
                          {currentInputMode === 'canvas' && (
                              <div className="bg-amber-50 w-full rounded-2xl p-4 mb-4 border-2 border-amber-200 shadow-sm relative text-center flex items-center justify-center gap-4 shrink-0">
                                  <div><p className="text-xs font-bold text-amber-700 mb-1">正解は...</p><p className="text-5xl font-black text-stone-800">{word.kanji}</p></div>
                                  {(word.usage_example || word.origin_logic) && (
                                      <div className="flex-1 text-left">
                                          {word.origin_logic && <p className="text-[10px] font-bold text-stone-600 bg-white p-1.5 rounded border border-stone-100 leading-tight">💡 {word.origin_logic}</p>}
                                          {!word.origin_logic && word.usage_example && <p className="text-[10px] font-bold text-stone-600 bg-white p-1.5 rounded border border-stone-100 leading-tight">📖 {word.usage_example}</p>}
                                      </div>
                                  )}
                              </div>
                          )}
                          <div className="flex gap-3 w-full shrink-0">
                              <button onClick={() => handleSelfJudge(false)} className="flex-1 bg-white text-rose-500 font-black py-4 rounded-2xl border-b-4 border-rose-200 active:translate-y-1 active:border-b-0 transition text-base">❌ 書けなかった</button>
                              <button onClick={() => handleSelfJudge(true)} className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg hover:opacity-90 active:scale-95 transition text-base tracking-widest">⭕ 書けた！</button>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {(currentInputMode === 'quiz' || currentInputMode === 'typing') && (
              <div className="mb-8 text-center w-full flex flex-col items-center">
                {currentInputMode === 'typing' && mistakeCount >= 1 && (showFlashAnswer ? (<div className="animate-bounce"><p className="text-sm text-rose-500 font-bold mb-2">答えを覚えて！</p><p className="text-5xl font-black text-rose-600">{renderReading(word.reading, word.okurigana)}</p></div>) : (<p className="text-lg font-bold text-stone-400 mb-4 animate-pulse bg-stone-100 py-1 px-4 rounded-full inline-block">ひらがなで入力してね</p>))}
                
                {currentInputMode === 'quiz' ? (
                    <div className="w-full flex flex-col items-center">
                        {langMode === 'kanji_to_read' ? (
                            <div className="bg-stone-50 border-2 border-stone-200 rounded-3xl p-8 shadow-inner w-full"><h2 className="text-[5rem] font-black text-stone-800 leading-none">{word.kanji}</h2></div>
                        ) : (
                            <div className="bg-sky-50 border-2 border-sky-200 rounded-3xl p-6 shadow-inner w-full"><h2 className="text-4xl font-black text-sky-800 mb-3">{renderReading(word.reading, word.okurigana)}</h2>{word.sentence && <p className="text-stone-600 font-bold text-lg bg-white py-2 px-4 rounded-xl shadow-sm border border-sky-100">{word.sentence.replace('□', '〇')}</p>}</div>
                        )}
                        
                        {feedbackMsg && (
                            <div className="mt-4 bg-rose-50 border-2 border-rose-200 text-stone-700 py-2 px-5 rounded-xl text-sm animate-in zoom-in shadow-sm font-bold">
                                {feedbackMsg}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-stone-50 border-2 border-stone-200 rounded-3xl p-6 shadow-inner mb-6 w-full">
                        <h2 className="text-6xl font-black text-stone-800 mb-3">{word.kanji}</h2>
                        {word.sentence && <p className="text-stone-500 font-bold mb-3">{word.sentence}</p>}
                        <p className="text-sm font-black text-sky-600 bg-sky-100 py-1 px-4 rounded-full inline-block animate-pulse">読みを入力！</p>
                    </div>
                )}
              </div>
          )}

          {currentInputMode === 'quiz' && (
              <div className="grid grid-cols-1 gap-3 w-full mt-auto">
                  {options.map((opt) => (
                      <button key={opt.id} onClick={() => checkAnswer(langMode === 'kanji_to_read' ? getFullReading(opt.reading, opt.okurigana) : opt.kanji)} className="bg-white border-b-4 border-stone-200 text-stone-700 font-black py-5 px-4 rounded-2xl transition-all text-2xl shadow-sm active:translate-y-1 active:border-b-0">
                          {langMode === 'kanji_to_read' ? renderReading(opt.reading, opt.okurigana) : opt.kanji}
                      </button>
                  ))}
              </div>
          )}
          
          {currentInputMode === 'typing' && (
              <div className="w-full mt-auto">
                  <div className="relative mb-4 w-full flex items-center justify-center">
                      <input type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkAnswer(userAnswer)} className="w-full border-4 border-sky-200 rounded-2xl py-5 pl-5 pr-16 text-center text-3xl font-black focus:outline-none focus:border-sky-500 text-stone-800 shadow-inner bg-stone-50" placeholder="ひらがなで..." autoFocus />
                      <button onClick={startListening} className={`absolute right-4 text-4xl transition-transform active:scale-90 ${isListening ? 'animate-pulse text-rose-500 scale-110 drop-shadow-md' : 'text-stone-400 hover:text-sky-500'}`} title="マイクで答える">
                          {isListening ? '🎙️' : '🎤'}
                      </button>
                  </div>
                  {feedbackMsg && (
                      <div className="mb-4 bg-rose-50 border-2 border-rose-200 text-stone-700 py-2 px-5 rounded-xl text-sm animate-in zoom-in shadow-sm font-bold">
                          {feedbackMsg}
                      </div>
                  )}
                  <button onClick={() => checkAnswer(userAnswer)} className="w-full bg-gradient-to-r from-sky-400 to-indigo-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 text-xl tracking-widest">答える！</button>
                  <p className="text-[11px] text-stone-400 mt-4 font-bold bg-stone-100 py-2 px-3 rounded-lg border border-stone-100 shadow-inner">
                      💡 マイクボタン(🎤)を押して声で答えることもできるよ！
                  </p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}