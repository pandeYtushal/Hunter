import { useMemo, useState } from "react";
import { Mic, MicOff } from "lucide-react";
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
    <Button
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
      aria-pressed={isListening}
      className={`h-10 w-10 px-0 ${isListening ? "ring-2 ring-zinc-400 ring-offset-2 ring-offset-white dark:ring-zinc-500 dark:ring-offset-black" : ""}`}
      disabled={disabled}
      icon={isListening ? <MicOff size={16} /> : <Mic size={16} />}
      variant={isListening ? "primary" : "secondary"}
      onClick={toggleListening}
    />
  );
};
