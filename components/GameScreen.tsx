// components/GameScreen.tsx
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
  stopDrawing: () => void;
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

  const [word] = questQueue.slice(currentIndex, currentIndex + 1);

  if (!word) return null; 

  if (isTransitioning) {
    return (
      <div className={`min-h-screen ${currentUser.light} flex flex-col items-center justify-center pt-8 px-4`}>
        <div className="animate-spin text-5xl mb-4">🌀</div>
        <p className="text-stone-500 font-bold tracking-widest">次のステージへ...</p>
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

  // ★ 読み上げボタンの共通コンポーネント
  const VoiceButton = ({ text }: { text: string }) => (
    <button 
      onClick={() => speakWord(text)}
      className="bg-white text-sky-500 p-2 rounded-full shadow-md border border-sky-100 active:scale-90 transition-transform ml-2 shrink-0"
    >
      <span className="text-xl">🔊</span>
    </button>
  );

  return (
    <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-4 px-4 font-sans pb-10`}>
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[600px] flex flex-col relative border border-white/50">
         
         {/* モードラベル */}
         {mode === 'parent_challenge' && <div className="w-full bg-rose-500 text-white text-center py-1.5 text-xs font-black tracking-widest">🔥 パパからの挑戦状 🔥</div>}
         {mode === 'weekend' && (
           <div className="w-full bg-slate-900 text-white p-5 flex flex-col items-center relative overflow-hidden">
             <p className="text-xs font-bold text-indigo-300 mb-2 tracking-widest">WEEKEND BOSS BATTLE</p>
             <div className={`text-7xl mb-3 transition-transform duration-100 ${isBossAttacked ? 'scale-90 opacity-50' : 'animate-bounce'}`}>🐉</div>
             <div className="w-full max-w-xs bg-slate-700 rounded-full h-4 border-2 border-slate-500 overflow-hidden">
               <div className="bg-gradient-to-r from-rose-500 to-orange-500 h-full transition-all duration-300" style={{ width: `${(bossHp / currentGameGoal) * 100}%` }}></div>
             </div>
           </div>
         )}
         
        {/* クエストヘッダー */}
        <div className={`${currentUser.color} p-4 flex justify-between items-center text-white shadow-sm`}>
          <div className="flex flex-col">
            <span className="font-black tracking-widest text-[10px] uppercase opacity-70">QUEST {currentIndex + 1} / {questQueue.length}</span>
            <span className="text-xs font-bold">リクが応援してるワン！🦴</span>
          </div>
          <button onClick={() => { stopSpeaking(); setView('menu'); }} className="text-[10px] font-black bg-black/20 px-4 py-2 rounded-full active:bg-black/40 transition">むらへもどる</button>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center relative w-full">
          
          {/* Rickの解説モーダル */}
          {showRick && (
            <div className="absolute inset-0 bg-stone-900/60 z-30 flex flex-col items-center justify-center p-4 animate-in fade-in backdrop-blur-md">
              <div className="bg-white rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl max-w-xs w-full animate-in zoom-in duration-300">
                <img src="/Rick.png" alt="Rick" className="w-24 h-24 rounded-full border-4 border-orange-400 mb-4 shadow-xl object-cover" />
                <p className="text-2xl font-black text-orange-600 mb-4">{message}</p>
                
                <div className="mb-6 w-full bg-stone-50 rounded-3xl p-5 border-2 border-stone-100">
                  <p className="text-5xl font-black text-stone-800 mb-2">{word.kanji}</p>
                  <div className="flex items-center justify-center">
                    <p className="text-xl font-bold text-sky-600">{renderReading(word.reading, word.okurigana)}</p>
                    <VoiceButton text={getFullReading(word.reading, word.okurigana)} />
                  </div>
                </div>

                {message.includes('正解') && word.origin_logic && (
                  <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 text-left shadow-inner">
                    <p className="text-xs font-black text-amber-700 mb-2">💡 リクの豆知識</p>
                    <p className="text-[13px] text-stone-700 font-bold leading-relaxed">{word.origin_logic}</p>
                  </div>
                )}
                <button onClick={nextQuestion} className={`${currentUser.color} text-white font-black py-5 w-full rounded-2xl shadow-xl active:scale-95 transition tracking-widest text-lg`}>次へ！ 🐾</button>
              </div>
            </div>
          )}
          
          {/* 自己判定・手書きモードのメインUI */}
          {(currentInputMode === 'canvas' || currentInputMode === 'self') && (
              <div className="flex-1 w-full flex flex-col items-center">
                  <div className="text-center mb-6 w-full flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center">
                          <p className="text-4xl font-black text-sky-600 bg-sky-50 px-6 py-3 rounded-3xl border-2 border-sky-100 shadow-inner">
                            {renderReading(word.reading, word.okurigana)}
                          </p>
                          <VoiceButton text={getFullReading(word.reading, word.okurigana)} />
                        </div>
                        {word.sentence && <p className="text-base font-bold text-stone-600 mt-4 px-4">{word.sentence.replace('□', '〇')}</p>}
                      </div>
                  </div>

                  {/* メインエリア（キャンバスまたは隠し漢字） */}
                  <div className="relative w-full flex-1 min-h-[250px] mb-6">
                    {currentInputMode === 'canvas' ? (
                        <div className={`h-full w-full bg-white border-4 rounded-[2rem] shadow-inner relative overflow-hidden transition-colors ${gameStep === 0 ? 'border-emerald-200' : 'border-stone-200'}`}>
                            {gameStep === 0 && <span className="absolute top-4 left-4 text-stone-300 font-black text-sm pointer-events-none tracking-widest animate-pulse">ここに書いてね！</span>}
                            <canvas 
                              ref={canvasRef} 
                              width={400} 
                              height={300} 
                              className={`w-full h-full touch-none ${gameStep === 0 ? 'cursor-crosshair' : 'cursor-default'}`} 
                              onPointerDown={gameStep === 0 ? startDrawing : undefined} 
                              onPointerMove={gameStep === 0 ? draw : undefined} 
                              onPointerUp={gameStep === 0 ? stopDrawing : undefined} 
                              onPointerLeave={gameStep === 0 ? stopDrawing : undefined}
                              style={{ touchAction: 'none' }} 
                            />
                            {gameStep === 0 && (
                                <button onClick={clearCanvas} className="absolute bottom-4 right-4 bg-stone-100 text-stone-500 px-4 py-2 rounded-full text-xs font-black shadow-sm active:scale-90 transition">
                                    🗑️ 書きなおす
                                </button>
                            )}

                            {/* ★ 追加: 答え合わせ時 (gameStep === 1) の正解表示オーバーレイ */}
                            {gameStep === 1 && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in zoom-in duration-300">
                                    <span className="text-[9rem] font-black text-rose-500 leading-none drop-shadow-md">{word.kanji}</span>
                                    <div className="absolute top-4 right-4">
                                        <VoiceButton text={word.kanji} />
                                    </div>
                                    <span className="absolute bottom-4 text-rose-500 font-black tracking-widest text-sm animate-pulse bg-white/80 px-4 py-1 rounded-full">自分の字と見比べてね！</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full w-full bg-stone-50 border-4 border-dashed border-stone-200 rounded-[2.5rem] flex items-center justify-center">
                            {gameStep === 0 ? (
                              <div className="text-center">
                                <span className="text-8xl text-stone-200 block mb-4">✍️</span>
                                <span className="text-sm text-stone-400 font-black tracking-widest uppercase">頭の中で書いてみよう</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center animate-in zoom-in">
                                <span className="text-[9rem] font-black text-stone-800 leading-none drop-shadow-md">{word.kanji}</span>
                                <VoiceButton text={word.kanji} />
                              </div>
                            )}
                        </div>
                    )}
                  </div>

                  {/* ★ 自己判定ボタン */}
                  {gameStep === 0 ? (
                      <button 
                        onClick={() => { 
                            setGameStep(1); 
                            speakWord(word.kanji); // 正解表示時に読み上げ
                        }} 
                        className="w-full bg-stone-800 text-white font-black py-6 rounded-[2rem] shadow-xl active:scale-95 transition text-2xl tracking-widest mt-auto border-b-8 border-stone-950"
                      >
                        答え合わせ！ 👀
                      </button>
                  ) : (
                      <div className="w-full flex flex-col gap-4 animate-in slide-in-from-bottom-4 mt-auto">
                          <div className="flex gap-4 w-full">
                              <button 
                                onClick={() => handleSelfJudge(false)} 
                                className="flex-1 bg-white text-rose-500 font-black py-8 rounded-[2rem] border-2 border-rose-100 shadow-md active:translate-y-1 transition text-xl flex flex-col items-center"
                              >
                                <span className="text-3xl mb-1">❌</span>
                                <span>だめだった</span>
                              </button>
                              <button 
                                onClick={() => handleSelfJudge(true)} 
                                className="flex-1 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-black py-8 rounded-[2rem] shadow-xl active:translate-y-1 transition text-xl flex flex-col items-center"
                              >
                                <span className="text-3xl mb-1">⭕</span>
                                <span>書けた！</span>
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {/* クイズ・タイピングモードのUI */}
          {(currentInputMode === 'quiz' || currentInputMode === 'typing') && (
              <div className="w-full flex flex-col items-center flex-1">
                
                {/* 出題エリア */}
                <div className="w-full mb-8">
                    {currentInputMode === 'quiz' ? (
                        <div className="flex flex-col items-center">
                            {langMode === 'kanji_to_read' ? (
                                <div className="bg-stone-50 border-2 border-stone-200 rounded-[2.5rem] p-10 shadow-inner w-full text-center">
                                  <h2 className="text-[6rem] font-black text-stone-800 leading-none mb-4">{word.kanji}</h2>
                                  <VoiceButton text={word.kanji} />
                                </div>
                            ) : (
                                <div className="bg-sky-50 border-2 border-sky-200 rounded-[2.5rem] p-8 shadow-inner w-full text-center">
                                  <div className="flex items-center justify-center mb-4">
                                    <h2 className="text-5xl font-black text-sky-800 leading-tight">{renderReading(word.reading, word.okurigana)}</h2>
                                    <VoiceButton text={getFullReading(word.reading, word.okurigana)} />
                                  </div>
                                  {word.sentence && <p className="text-stone-600 font-bold text-lg bg-white/80 py-3 px-6 rounded-2xl shadow-sm">「{word.sentence.replace('□', '〇')}」</p>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-stone-50 border-2 border-stone-200 rounded-[2.5rem] p-10 shadow-inner w-full text-center">
                            <h2 className="text-7xl font-black text-stone-800 mb-4">{word.kanji}</h2>
                            <VoiceButton text={word.kanji} />
                        </div>
                    )}
                </div>

                {/* 回答エリア */}
                {currentInputMode === 'quiz' ? (
                  <div className="grid grid-cols-1 gap-4 w-full mt-auto">
                      {options.map((opt) => (
                          <button 
                            key={opt.id} 
                            onClick={() => checkAnswer(langMode === 'kanji_to_read' ? getFullReading(opt.reading, opt.okurigana) : opt.kanji)} 
                            className="bg-white border-b-4 border-stone-200 text-stone-700 font-black py-5 px-4 rounded-2xl transition-all text-2xl shadow-sm active:translate-y-1 active:border-b-0 hover:bg-stone-50"
                          >
                              {langMode === 'kanji_to_read' ? renderReading(opt.reading, opt.okurigana) : opt.kanji}
                          </button>
                      ))}
                  </div>
                ) : (
                  <div className="w-full mt-auto">
                      <div className="relative mb-6">
                          <input 
                            type="text" 
                            value={userAnswer} 
                            onChange={(e) => setUserAnswer(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && checkAnswer(userAnswer)} 
                            className="w-full border-4 border-sky-200 rounded-3xl py-6 px-6 text-center text-4xl font-black focus:outline-none focus:border-sky-500 text-stone-800 shadow-inner bg-stone-50" 
                            placeholder="よみかた..." 
                            autoFocus 
                          />
                          <button onClick={startListening} className={`absolute right-4 top-1/2 -translate-y-1/2 text-4xl active:scale-90 transition-transform ${isListening ? 'animate-pulse text-rose-500' : 'text-stone-300'}`}>
                              {isListening ? '🎙️' : '🎤'}
                          </button>
                      </div>
                      <button onClick={() => checkAnswer(userAnswer)} className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 text-2xl tracking-widest border-b-8 border-indigo-800">決定！ 🐾</button>
                  </div>
                )}

                {/* フィードバックメッセージ */}
                {feedbackMsg && (
                    <div className="mt-6 bg-rose-50 border-2 border-rose-200 text-stone-700 py-3 px-6 rounded-2xl text-sm animate-in zoom-in shadow-sm font-bold">
                        {feedbackMsg}
                    </div>
                )}

              </div>
          )}
        </div>
      </div>
    </div>
  );
}