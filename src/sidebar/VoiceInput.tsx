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
      className={`h-[28px] w-[28px] shrink-0 rounded-[8px] border border-zinc-700/60 text-zinc-400 flex items-center justify-center hover:bg-[#323232] hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${isListening ? "ring-1 ring-[#ff6b35] text-[#ff6b35]" : ""}`}
      disabled={disabled}
      onClick={toggleListening}
    >
      {isListening ? <MicOff size={12} /> : <Sidebar size={12} />}
    </button>
  );
};
