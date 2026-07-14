export type MicrophonePermissionState = PermissionState | "unsupported" | "prompt";

export interface SpeechToTextCallbacks {
  onInterimTranscript: (transcript: string) => void;
  onFinalTranscript: (transcript: string) => void;
  onError: (message: string) => void;
  onListeningChange: (isListening: boolean) => void;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const getSpeechRecognitionConstructor = () => window.SpeechRecognition ?? window.webkitSpeechRecognition;

export const isSpeechRecognitionSupported = () => Boolean(getSpeechRecognitionConstructor());

export const getMicrophonePermissionState = async (): Promise<MicrophonePermissionState> => {
  if (!navigator.permissions?.query) {
    return "unsupported";
  }

  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "unsupported";
  }
};

export const requestMicrophonePermission = async (): Promise<boolean> => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not available in this browser context.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
  return true;
};

export class SpeechToTextSession {
  private recognition: SpeechRecognitionInstance | null = null;
  private finalTranscript = "";
  private silenceTimeoutId: any = null;

  constructor(private readonly callbacks: SpeechToTextCallbacks) {}

  start() {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      this.callbacks.onError("Speech recognition is not supported in this browser.");
      return;
    }

    this.stop();
    this.finalTranscript = "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          this.finalTranscript = `${this.finalTranscript} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      const fullText = `${this.finalTranscript} ${interimTranscript}`.trim();
      this.callbacks.onInterimTranscript(fullText);

      // Silence detection for continuous voice input
      if (this.silenceTimeoutId) {
        clearTimeout(this.silenceTimeoutId);
      }

      this.silenceTimeoutId = setTimeout(() => {
        const queryText = `${this.finalTranscript} ${interimTranscript}`.trim();
        if (queryText) {
          this.callbacks.onFinalTranscript(queryText);
          this.finalTranscript = ""; // Reset for the next spoken command
        }
      }, 1500) as any;
    };

    recognition.onerror = (event) => {
      this.callbacks.onError(event.message || `Speech recognition failed: ${event.error}`);
      this.callbacks.onListeningChange(false);
    };

    recognition.onend = () => {
      this.callbacks.onListeningChange(false);

      if (this.recognition && this.finalTranscript) {
        this.callbacks.onFinalTranscript(this.finalTranscript);
      }
    };

    this.recognition = recognition;
    recognition.start();
    this.callbacks.onListeningChange(true);
  }

  stop() {
    if (this.silenceTimeoutId) {
      clearTimeout(this.silenceTimeoutId);
      this.silenceTimeoutId = null;
    }

    if (!this.recognition) {
      return;
    }

    const rec = this.recognition;
    this.recognition = null;
    rec.stop();
  }
}
