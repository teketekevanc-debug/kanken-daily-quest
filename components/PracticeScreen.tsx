// components/PracticeScreen.tsx
'use client'
import React, { useState, useEffect } from 'react'

type PracticeScreenProps = {
  currentUser: any;
  questQueue: any[];
  currentIndex: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startDrawing: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  draw: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  stopDrawing: () => void;
  clearCanvas: () => void;
  handleSelfJudge: (isCorrect: boolean, timeSpent: number) => void;
  renderReading: (reading: string, okurigana?: string | null) => React.ReactNode;
  speakWord: (text: string) => void;
  getFullReading: (reading: string, okurigana?: string | null) => string;
  setView: (view: string) => void;
}

export default function PracticeScreen(props: PracticeScreenProps) {
  const {
    currentUser, questQueue, currentIndex,
    canvasRef, startDrawing, draw, stopDrawing, clearCanvas,
    handleSelfJudge, renderReading, speakWord, getFullReading, setView
  } = props;

  const [step, setStep] = useState<'write' | 'judge'>('write');
  const [startTime, setStartTime] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  const word = questQueue[currentIndex];

  useEffect(() => {
    // 問題が変わるたびにステップと開始時間をリセット
    setStep('write');
    setStartTime(Date.now());
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [currentIndex, word, canvasRef]);

  if (!word) return null;

  // 「答えを見る」を押した瞬間に、かかった秒数を計算して記録
  const handleCheckAnswer = () => {
    setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    setStep('judge');
    speakWord(word.kanji);
  };

  const onJudge = (isCorrect: boolean) => {
    handleSelfJudge(isCorrect, timeSpent);
  };

  return (
    <div className={`min-h-screen ${currentUser.light} flex flex-col items-center pt-8 px-4 font-sans pb-10`}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border-2 border-stone-200 overflow-hidden flex flex-col min-h-[600px]">
        
        {/* ヘッダー */}
        <div className="bg-stone-100 p-4 flex justify-between items-center border-b border-stone-200">
          <div className="text-stone-500 font-bold text-sm tracking-widest">
            {currentIndex + 1} / {questQueue.length} 問目
          </div>
          <button onClick={() => setView('menu')} className="text-xs font-bold text-stone-400 bg-white px-3 py-1 rounded-md border border-stone-200 active:scale-95 hover:bg-stone-50 transition-colors">
            中断して戻る
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center">
          {/* 問題エリア */}
          <div className="text-center mb-8 w-full">
            <div className="flex justify-center items-center gap-2 mb-4">
              <p className="text-3xl font-black text-stone-800 tracking-widest">
                {renderReading(word.reading, word.okurigana)}
              </p>
              <button onClick={() => speakWord(getFullReading(word.reading, word.okurigana))} className="bg-stone-100 text-stone-500 p-2 rounded-full active:scale-90 transition-transform">
                🔊
              </button>
            </div>
            {word.sentence && (
              <p className="text-base font-bold text-stone-600 bg-stone-50 p-4 rounded-lg border border-stone-100">
                {word.sentence.replace('□', '〇')}
              </p>
            )}
          </div>

          {/* キャンバスエリア（漢字練習の十字リーダー風） */}
          <div className="relative w-full flex-1 min-h-[250px] mb-6">
            <div className={`w-full h-full bg-white border-2 rounded-lg relative overflow-hidden transition-colors ${step === 'write' ? 'border-stone-300' : 'border-stone-200'}`}>
              
              {/* 十字の補助線 */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                <div className="w-full h-px border-t border-dashed border-stone-300"></div>
                <div className="absolute h-full w-px border-l border-dashed border-stone-300"></div>
              </div>

              <canvas 
                ref={canvasRef} 
                width={400} 
                height={300} 
                className={`w-full h-full touch-none relative z-10 ${step === 'write' ? 'cursor-crosshair' : 'cursor-default pointer-events-none'}`} 
                onPointerDown={step === 'write' ? startDrawing : undefined} 
                onPointerMove={step === 'write' ? draw : undefined} 
                onPointerUp={step === 'write' ? stopDrawing : undefined} 
                onPointerLeave={step === 'write' ? stopDrawing : undefined}
                style={{ touchAction: 'none' }} 
              />
              
              {step === 'write' && (
                <button onClick={clearCanvas} className="absolute bottom-3 right-3 z-20 bg-stone-100 text-stone-500 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm active:scale-90 transition border border-stone-200">
                  🗑️ 消す
                </button>
              )}

              {/* 答え合わせ時の正解表示 */}
              {step === 'judge' && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-in zoom-in duration-200">
                  <span className="text-[8rem] font-black text-rose-600 leading-none">{word.kanji}</span>
                </div>
              )}
            </div>
          </div>

          {/* コントロールエリア */}
          <div className="w-full mt-auto">
            {step === 'write' ? (
              <button 
                onClick={handleCheckAnswer} 
                className="w-full bg-stone-800 text-white font-black py-5 rounded-lg shadow-sm active:scale-95 transition text-xl tracking-widest hover:bg-stone-700"
              >
                答えを見る 👀
              </button>
            ) : (
              <div className="flex gap-3 w-full animate-in slide-in-from-bottom-2">
                <button 
                  onClick={() => onJudge(false)} 
                  className="flex-1 bg-white text-rose-600 font-black py-5 rounded-lg border-2 border-rose-200 shadow-sm active:translate-y-1 transition text-lg flex flex-col items-center hover:bg-rose-50"
                >
                  <span className="text-2xl mb-1">❌</span>
                  <span>だめだった</span>
                </button>
                <button 
                  onClick={() => onJudge(true)} 
                  className="flex-1 bg-emerald-600 text-white font-black py-5 rounded-lg border-2 border-emerald-700 shadow-sm active:translate-y-1 transition text-lg flex flex-col items-center hover:bg-emerald-500"
                >
                  <span className="text-2xl mb-1">⭕</span>
                  <span>書けた！</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}