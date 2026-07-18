import { useMemo, useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";
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
      aria-label={isListening ? "Stop Voice Session" : "Start Voice Session"}
      aria-pressed={isListening}
      className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition duration-150 cursor-pointer border ${
        isListening
          ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20"
          : "bg-transparent border-transparent hover:border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
      }`}
      disabled={disabled}
      onClick={handleToggleClick}
      title={isListening ? "Stop Voice Session" : "Start Voice Session"}
    >
      {isListening ? (
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <Mic size={14} className="relative z-10 text-rose-500" />
        </span>
      ) : (
        <Mic size={14} />
      )}
    </button>
  );
};

