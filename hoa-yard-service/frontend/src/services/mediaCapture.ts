/**
 * Наносит штамп даты/времени (и опционально координат) на фото прямо на устройстве
 * перед загрузкой — так штамп нельзя подделать постфактум на сервере из EXIF,
 * который клиент может отредактировать.
 */
export async function stampPhoto(file: File, label?: string): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D недоступен");

  ctx.drawImage(bitmap, 0, 0);

  const stampText = `${new Date().toLocaleString("ru-RU")}${label ? " · " + label : ""}`;
  const fontSize = Math.max(16, Math.round(canvas.width * 0.025));
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  const metrics = ctx.measureText(stampText);
  const paddingX = fontSize * 0.6;
  const barHeight = fontSize * 1.8;

  ctx.fillStyle = "rgba(24, 24, 27, 0.72)";
  ctx.fillRect(0, canvas.height - barHeight, metrics.width + paddingX * 2, barHeight);

  ctx.fillStyle = "#FAFAF9";
  ctx.textBaseline = "middle";
  ctx.fillText(stampText, paddingX, canvas.height - barHeight / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Не удалось сохранить фото"))),
      "image/jpeg",
      0.85
    );
  });
}
