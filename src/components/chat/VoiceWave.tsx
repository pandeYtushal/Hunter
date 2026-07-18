import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface VoiceWaveProps {
  onClose: () => void;
  transcript: string;
}

export const VoiceWave: React.FC<VoiceWaveProps> = ({ onClose, transcript }) => {
  const [hasMicrophone, setHasMicrophone] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const displayAmp = useRef(0);
  const circleRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);

  // Initialize Microphone Web Audio API Analysis
  useEffect(() => {
    let active = true;
    let rafId = 0;

    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 32;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateVisuals = () => {
          if (!active) return;
          
          let vol = 0;
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            vol = Math.min(100, Math.max(0, avg * 1.8));
          }

          // Smooth interpolator spring
          displayAmp.current += (vol - displayAmp.current) * 0.15;
          const amp = displayAmp.current;

          // Direct DOM updates for 60fps hardware-accelerated renders
          if (circleRef.current) {
            circleRef.current.style.transform = `scale(${1 + amp * 0.006})`;
          }
          if (ring1Ref.current) {
            ring1Ref.current.style.transform = `scale(${1 + amp * 0.015})`;
            ring1Ref.current.style.opacity = `${Math.min(0.5, 0.25 + amp * 0.003)}`;
          }
          if (ring2Ref.current) {
            ring2Ref.current.style.transform = `scale(${1 + amp * 0.024})`;
            ring2Ref.current.style.opacity = `${Math.min(0.3, 0.1 + amp * 0.002)}`;
          }
          
          rafId = requestAnimationFrame(updateVisuals);
        };

        updateVisuals();
      } catch (err) {
        console.warn("Could not access microphone for live talk visualization:", err);
        setHasMicrophone(false);
        
        // Mock breathing wave animation loop if mic is blocked/disabled
        const updateMockVisuals = () => {
          if (!active) return;
          const vol = 15 + Math.sin(Date.now() / 250) * 10;
          displayAmp.current += (vol - displayAmp.current) * 0.1;
          const amp = displayAmp.current;

          if (circleRef.current) {
            circleRef.current.style.transform = `scale(${1 + amp * 0.006})`;
          }
          if (ring1Ref.current) {
            ring1Ref.current.style.transform = `scale(${1 + amp * 0.015})`;
            ring1Ref.current.style.opacity = `${0.25 + amp * 0.003}`;
          }
          if (ring2Ref.current) {
            ring2Ref.current.style.transform = `scale(${1 + amp * 0.024})`;
            ring2Ref.current.style.opacity = `${0.1 + amp * 0.002}`;
          }

          rafId = requestAnimationFrame(updateMockVisuals);
        };
        updateMockVisuals();
      }
    }

    void initAudio();

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, [hasMicrophone]);

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center justify-center select-none animate-[scale-up_0.2s_ease-out] font-sans">
      
      {/* Transcript Text Bubble - Floating Glass Box above the Orb */}
      {transcript.trim() ? (
        <div className="mb-6 max-w-xs px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-md shadow-xl text-center animate-fade-in max-h-16 overflow-y-auto custom-scrollbar">
          <p className="text-[12px] font-medium text-zinc-800 dark:text-zinc-100 leading-normal">
            "{transcript}"
          </p>
        </div>
      ) : (
        <div className="mb-6 px-3 py-1 rounded-full bg-white/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/50 backdrop-blur-sm text-center">
          <span className="text-[9px] font-mono tracking-widest text-zinc-400 dark:text-zinc-500 uppercase animate-pulse">
            Listening...
          </span>
        </div>
      )}

      {/* Central GPT-style Glowing Orb Container */}
      <div className="relative flex items-center justify-center h-24 w-24">
        
        {/* Rippling Outer Ring 2 */}
        <div 
          ref={ring2Ref}
          className="absolute h-20 w-20 rounded-full bg-indigo-600/10 dark:bg-indigo-500/10 blur-[2px] transition-all duration-75 ease-out"
        />

        {/* Rippling Outer Ring 1 */}
        <div 
          ref={ring1Ref}
          className="absolute h-16 w-16 rounded-full bg-indigo-600/20 dark:bg-indigo-500/20 blur-[1px] transition-all duration-75 ease-out"
        />

        {/* Core Glowing Orb */}
        <div 
          ref={circleRef}
          className="relative h-12 w-12 rounded-full bg-indigo-600 dark:bg-white shadow-[0_0_24px_rgba(99,102,241,0.5)] dark:shadow-[0_0_24px_rgba(255,255,255,0.9),inset_0_2px_4px_rgba(255,255,255,1)] transition-transform duration-75 ease-out flex items-center justify-center"
        />

        {/* Small Close Button Floating on the Right */}
        <button 
          onClick={onClose}
          className="absolute -right-14 p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer shadow-md"
          title="Exit Live Talk"
        >
          <X size={12} />
        </button>

      </div>
    </div>
  );
};

export default VoiceWave;
