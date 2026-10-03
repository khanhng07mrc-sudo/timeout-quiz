"use client";

import { useEffect, useState } from "react";

interface Props {
  teamName: string;
  initialSeconds?: number;
  onComplete?: () => void;
}

export default function StealPrepCountdown({
  teamName,
  initialSeconds = 3,
  onComplete,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 pointer-events-none">
      <div className="text-center space-y-4 max-w-lg mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 shadow-2xl text-4xl animate-bounce">
          ⚡
        </div>
        <div>
          <div className="text-sm uppercase tracking-widest text-amber-400 font-extrabold mb-1">
            CƯỚP CHUÔNG THÀNH CÔNG!
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white drop-shadow-lg">
            {teamName}
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center pt-2">
          <p className="text-sm text-gray-300 font-medium mb-2">Đồng hồ trả lời bắt đầu sau:</p>
          <div className="w-24 h-24 rounded-full border-4 border-amber-400 flex items-center justify-center text-5xl font-black text-amber-300 bg-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-pulse">
            {secondsLeft > 0 ? secondsLeft : "GO!"}
          </div>
          <p className="text-xs text-amber-200/80 mt-3 font-semibold uppercase tracking-wider">
            SẴN SÀNG TRẢ LỜI
          </p>
        </div>
      </div>
    </div>
  );
}
