/**
 * Video capture of the 3D view: the WebGL canvas as a 30 fps stream into a
 * MediaRecorder, saved as WebM (VP9 where the browser has it, else VP8 or
 * MP4 on Safari). The canvas keeps its drawing buffer, so every frame the
 * camera rig renders goes into the file.
 */

export interface Recording {
  stop: () => Promise<Blob>;
  mime: string;
}

const TYPES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];

export function canRecord(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype;
}

export function startRecording(canvas: HTMLCanvasElement, fps = 30, bitrate = 12_000_000): Recording {
  const mime = TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: bitrate } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.start(500);
  return {
    mime: rec.mimeType || mime,
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
        };
        rec.stop();
      }),
  };
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
