import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

interface UseSpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

function subscribeToSpeechSynthesis() {
  return () => {};
}

function getSpeechSynthesisSupport() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getServerSpeechSynthesisSupport() {
  return false;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const langPrefix = lang.split("-")[0];

  return (
    voices.find((voice) => voice.lang === lang && !voice.localService) ??
    voices.find((voice) => voice.lang.startsWith(langPrefix)) ??
    voices[0]
  );
}

export function useSpeechSynthesis({
  lang = "en-US",
  rate = 1.0,
  onEnd,
  onError,
}: UseSpeechSynthesisOptions = {}): UseSpeechSynthesisReturn {
  const isSupported = useSyncExternalStore(
    subscribeToSpeechSynthesis,
    getSpeechSynthesisSupport,
    getServerSpeechSynthesisSupport,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onEnd, onError]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) {
        onErrorRef.current?.("Your browser doesn't support text-to-speech.");
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      const voice = pickVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEndRef.current?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onErrorRef.current?.("Failed to play audio. Please try again.");
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, lang, rate],
  );

  return { speak, stop, isSpeaking, isSupported };
}
