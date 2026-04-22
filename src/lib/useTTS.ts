export function speak(text: string, voiceName: string = "", rate: number = 1) {
  if (typeof window === "undefined") return;

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();

  if (voiceName) {
    const match = voices.find((v) => v.name === voiceName);
    if (match) utterance.voice = match;
  }

  utterance.rate = rate;
  speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  speechSynthesis.cancel();
}
