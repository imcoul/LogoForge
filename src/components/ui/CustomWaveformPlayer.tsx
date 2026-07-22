import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music, ChevronRight } from 'lucide-react';

export const CustomWaveformPlayer: React.FC<{ base64Data: string; name: string }> = ({ base64Data, name }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(base64Data);
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [base64Data]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error(err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = parseFloat(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-100 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-zinc-800 text-indigo-600 rounded-lg">
            <Music size={16} />
          </div>
          <span className="font-bold text-sm text-neutral-800 dark:text-zinc-200 truncate max-w-[200px]">{name}</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-400">
          {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:
          {(Math.floor(duration % 60)).toString().padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-brand-lead hover:bg-brand-lead/90 text-white flex items-center justify-center shadow-md transition-all shrink-0 hover:scale-105 cursor-pointer"
        >
          {isPlaying ? (
            <div className="flex gap-1 items-center justify-center">
              <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDuration: '0.6s' }} />
              <div className="w-1.5 h-4 bg-white rounded-full animate-bounce" style={{ animationDuration: '0.4s' }} />
              <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDuration: '0.5s' }} />
            </div>
          ) : (
            <ChevronRight size={18} className="translate-x-0.5 text-white fill-white" />
          )}
        </button>

        <div className="flex-1 flex items-center gap-1 h-10 overflow-hidden px-1">
          {Array.from({ length: 24 }).map((_, i) => {
            const baseHeight = 12 + Math.sin(i * 0.5) * 8;
            const actHeight = isPlaying ? baseHeight + (Math.random() * 12 - 6) : baseHeight;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${isPlaying ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-neutral-200 dark:bg-zinc-800'}`}
                style={{
                  height: `${Math.max(4, Math.min(32, actHeight))}px`,
                }}
              />
            );
          })}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={handleScrub}
        className="w-full h-1 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
    </div>
  );
};
