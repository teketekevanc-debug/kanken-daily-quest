// components/FloatingTimer.tsx
'use client'
import React, { useState, useEffect } from 'react'

export default function FloatingTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1秒ごとにカウントアップ
    const interval = setInterval(() => {
      setSeconds(prev => {
        const next = prev + 1;
        // 30秒ごとに表示フラグをONにする
        if (next > 0 && next % 30 === 0) {
          setIsVisible(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 表示フラグがONになったら、2.5秒後にフワッと消す（OFFにする）
    if (isVisible) {
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  // 分と秒の計算
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const timeText = m > 0 ? `${m}分${s}秒` : `${s}秒`;

  return (
    <div 
      className={`fixed bottom-24 right-4 z-50 pointer-events-none transition-all duration-700 ease-out flex items-center gap-2 bg-stone-800/80 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg font-black text-sm
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
    >
      <span className="animate-pulse">⏳</span>
      <span>{timeText} 経過</span>
    </div>
  )
}