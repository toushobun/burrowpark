/** 原图短边不放大，只把长边限制在 1280px。 */
export function photoDimensions(width: number, height: number) {
  if (width <= 0 || height <= 0) throw new RangeError("无效的图片尺寸");
  const ratio = Math.min(1, 1280 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function compressPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const size = photoDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法处理照片");
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("照片压缩失败")),
        "image/jpeg",
        0.7,
      );
    });
  } finally {
    bitmap.close();
  }
}
