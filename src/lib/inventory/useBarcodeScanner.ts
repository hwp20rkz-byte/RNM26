"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// BarcodeDetector — нативный браузерный API (Chrome/Edge на Android и
// десктопе). Safari/iOS его не поддерживает на момент написания — честный
// фолбэк там один: ручной ввод кода без камеры (это не ограничение нашей
// реализации, а платформы).
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function useBarcodeScannerSupport(): boolean {
  const [supported] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window);
  return supported;
}

export function useBarcodeScanner(onDetect: (value: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!window.BarcodeDetector) {
      setError("Сканирование камерой не поддерживается этим браузером — введите код вручную.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      setActive(true);

      const tick = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetect(codes[0].rawValue);
              stop();
              return;
            }
          } catch {
            // кадр камеры ещё не готов — пробуем на следующем тике
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Не удалось получить доступ к камере — введите код вручную.");
    }
  }, [onDetect, stop]);

  useEffect(() => stop, [stop]);

  return { videoRef, start, stop, active, error };
}
