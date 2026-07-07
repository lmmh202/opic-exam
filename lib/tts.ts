const PREFERRED_VOICE_NAMES = [
  "Google US English",
  "Samantha",
  "Karen",
  "Daniel",
  "Microsoft Aria Online (Natural)",
  "Microsoft Jenny Online (Natural)",
  "Microsoft Zira",
  "Microsoft David",
  "Alex",
];

let voicesCache: SpeechSynthesisVoice[] | null = null;
let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }

  if (voicesCache && voicesCache.length > 0) {
    return Promise.resolve(voicesCache);
  }

  if (!voicesReadyPromise) {
    voicesReadyPromise = new Promise((resolve) => {
      const tryLoad = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          voicesCache = voices;
          resolve(voices);
          return true;
        }
        return false;
      };

      if (tryLoad()) return;

      const onVoicesChanged = () => {
        if (tryLoad()) {
          window.speechSynthesis.removeEventListener(
            "voiceschanged",
            onVoicesChanged,
          );
        }
      };

      window.speechSynthesis.addEventListener(
        "voiceschanged",
        onVoicesChanged,
      );

      // Safari and some browsers load voices asynchronously without firing promptly.
      window.setTimeout(() => {
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          onVoicesChanged,
        );
        if (!voicesCache || voicesCache.length === 0) {
          voicesCache = window.speechSynthesis.getVoices();
        }
        resolve(voicesCache ?? []);
      }, 250);
    });
  }

  return voicesReadyPromise;
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang = "en-US",
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;

  const langPrefix = lang.split("-")[0];

  for (const preferredName of PREFERRED_VOICE_NAMES) {
    const match = voices.find(
      (voice) =>
        voice.name.includes(preferredName) &&
        voice.lang.startsWith(langPrefix),
    );
    if (match) return match;
  }

  const exactLangMatch = voices.find((voice) => voice.lang === lang);
  if (exactLangMatch) return exactLangMatch;

  const localMatch = voices.find(
    (voice) => voice.lang.startsWith(langPrefix) && voice.localService,
  );
  if (localMatch) return localMatch;

  return voices.find((voice) => voice.lang.startsWith(langPrefix));
}

export interface SpeakTextOptions {
  text: string;
  lang?: string;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

export async function speakText({
  text,
  lang = "en-US",
  rate = 1.0,
  onStart,
  onEnd,
  onError,
}: SpeakTextOptions): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onError?.("Your browser doesn't support text-to-speech.");
    return;
  }

  window.speechSynthesis.cancel();

  const voices = await loadVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;

  const voice = pickVoice(voices, lang);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onError?.("Failed to play audio. Please try again.");

  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  window.speechSynthesis?.cancel();
}

export function preloadVoices(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    void loadVoices();
  }
}
