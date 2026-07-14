import { useMemo, useState, useEffect, useRef } from "react";
import {
  isSpeechRecognitionSupported,
  requestMicrophonePermission,
  getMicrophonePermissionState,
  SpeechToTextSession
} from "../speech/speechToText";

interface VoiceInputProps {
  active?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  onError: (message: string) => void;
  onTranscriptChange: (transcript: string) => void;
  onTranscriptSubmit: (transcript: string) => void;
}

export const VoiceInput = ({
  active = false,
  onToggle,
  disabled = false,
  onError,
  onTranscriptChange,
  onTranscriptSubmit
}: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);

  const callbacksRef = useRef({ onTranscriptChange, onTranscriptSubmit, onError });

  // Keep callbacks reference updated with latest props
  useEffect(() => {
    callbacksRef.current = { onTranscriptChange, onTranscriptSubmit, onError };
  });

  const session = useMemo(
    () =>
      new SpeechToTextSession({
        onInterimTranscript: (text) => callbacksRef.current.onTranscriptChange(text),
        onFinalTranscript: (transcript) => {
          callbacksRef.current.onTranscriptChange(transcript);
          callbacksRef.current.onTranscriptSubmit(transcript);
        },
        onError: (err) => callbacksRef.current.onError(err),
        onListeningChange: setIsListening
      }),
    [] // Empty dependency array ensures SpeechToTextSession is created exactly once
  );

  // Sync listening status with parent active control
  useEffect(() => {
    if (active) {
      if (!isListening) {
        const startSession = async () => {
          try {
            const permission = await getMicrophonePermissionState();
            if (permission !== "granted") {
              await requestMicrophonePermission();
            }
            session.start();
          } catch {
            callbacksRef.current.onError("Microphone permission was denied or unavailable.");
            setIsListening(false);
          }
        };
        startSession();
      }
    } else {
      if (isListening) {
        session.stop();
        setIsListening(false);
      }
    }
    // Cleanup STT on unmount
    return () => {
      session.stop();
    };
  }, [active, isListening, session]);

  const handleToggleClick = async () => {
    if (onToggle) {
      onToggle();
      return;
    }

    // Fallback self-managed toggle
    if (isListening) {
      session.stop();
      setIsListening(false);
    } else {
      if (!isSpeechRecognitionSupported()) {
        onError("Speech recognition is not supported in this browser.");
        return;
      }
      try {
        const permission = await getMicrophonePermissionState();
        if (permission !== "granted") {
          await requestMicrophonePermission();
        }
        session.start();
      } catch {
        onError("Microphone permission was denied or unavailable.");
        setIsListening(false);
      }
    }
  };

  return (
    <button
      type="button"
      aria-label={isListening ? "Stop Talk to Hunter" : "Start Talk to Hunter"}
      aria-pressed={isListening}
      className={`h-8 px-3.5 shrink-0 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 border cursor-pointer select-none active:scale-95 shadow-sm ${
        isListening
          ? "bg-rose-500/10 border-rose-500/40 text-rose-500 hover:bg-rose-500/20"
          : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]"
      }`}
      disabled={disabled}
      onClick={handleToggleClick}
    >
      <span className={`relative flex h-2 w-2 ${isListening ? "" : "hidden"}`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
      </span>
      <span>Talk to Hunter</span>
    </button>
  );
};
