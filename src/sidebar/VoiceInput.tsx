import { useMemo, useState } from "react";
import { Mic, MicOff, Sidebar } from "lucide-react";
import { Button } from "../shared/components/Button";
import {
  getMicrophonePermissionState,
  isSpeechRecognitionSupported,
  requestMicrophonePermission,
  SpeechToTextSession
} from "../speech/speechToText";

interface VoiceInputProps {
  disabled?: boolean;
  onError: (message: string) => void;
  onTranscriptChange: (transcript: string) => void;
  onTranscriptSubmit: (transcript: string) => void;
}

export const VoiceInput = ({
  disabled = false,
  onError,
  onTranscriptChange,
  onTranscriptSubmit
}: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);

  const session = useMemo(
    () =>
      new SpeechToTextSession({
        onInterimTranscript: onTranscriptChange,
        onFinalTranscript: (transcript) => {
          onTranscriptChange(transcript);
          onTranscriptSubmit(transcript);
        },
        onError,
        onListeningChange: setIsListening
      }),
    [onError, onTranscriptChange, onTranscriptSubmit]
  );

  const toggleListening = async () => {
    if (isListening) {
      session.stop();
      setIsListening(false);
      return;
    }

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
  };

  return (
    <button
      type="button"
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
      aria-pressed={isListening}
      className={`h-8 w-8 shrink-0 rounded-lg text-[var(--text-secondary)] flex items-center justify-center hover:bg-[var(--border-color)]/45 hover:text-[var(--text-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${isListening ? "bg-red-500/10 text-red-500" : ""}`}
      disabled={disabled}
      onClick={toggleListening}
    >
      {isListening ? <MicOff size={13} /> : <Mic size={13} />}
    </button>
  );
};
