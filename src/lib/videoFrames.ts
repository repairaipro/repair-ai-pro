/**
 * Extracts representative frames from a video file for AI diagnosis.
 *
 * There's no practical way to send raw video to GPT-4o's vision model
 * directly, and running ffmpeg in a Vercel serverless function is real
 * infrastructure risk for no real benefit here. Instead: sample a few
 * frames client-side via a hidden <video> + <canvas> (a technique that
 * works in every modern browser, no dependencies), upload them as images,
 * and feed them straight into the existing, already-working photo
 * analysis pipeline. One AI capability, two capture methods.
 */
export async function extractVideoFrames(file: File, frameCount = 4): Promise<Blob[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.src = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Could not read that video file.'));
  });

  const duration = video.duration;
  if (!isFinite(duration) || duration <= 0) {
    URL.revokeObjectURL(video.src);
    throw new Error('Could not read that video file.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported in this browser.');

  const frames: Blob[] = [];
  // Skip the very start/end (often blank/blurry) — sample evenly between 10%-90%.
  for (let i = 0; i < frameCount; i++) {
    const t = duration * (0.1 + (0.8 * i) / Math.max(1, frameCount - 1));
    await new Promise<void>((resolve, reject) => {
      video.currentTime = t;
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('Could not read that video file.'));
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (blob) frames.push(blob);
  }

  URL.revokeObjectURL(video.src);
  return frames;
}
