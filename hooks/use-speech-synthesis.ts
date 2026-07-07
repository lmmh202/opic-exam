import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { loadVoices, pickVoice, preloadVoices, stopSpeech } from "@/lib/tts";

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
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onEnd, onError]);

  useEffect(() => {
    if (isSupported) {
      preloadVoices();
    }
  }, [isSupported]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const stop = useCallback(() => {
    stopSpeech();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) {
        onErrorRef.current?.("Your browser doesn't support text-to-speech.");
        return;
      }

      stopSpeech();

      void (async () => {
        const voices = await loadVoices();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;

        const voice = pickVoice(voices, lang);
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

        window.speechSynthesis.speak(utterance);
      })();
    },
    [isSupported, lang, rate],
  );

  return { speak, stop, isSpeaking, isSupported };
}
