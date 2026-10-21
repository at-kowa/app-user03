import type { Image } from "./types";

// 画像を長辺 1,600px の JPEG に縮小して dataURL で返す（保存前にブラウザで縮小する）
export function resizeImage(file: File, maxSide = 1600, quality = 0.85): Promise<Image> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({
        name: file.name.replace(/\.\w+$/, "") + ".jpg",
        type: "image/jpeg",
        size: Math.round(dataUrl.length * 0.75),
        dataUrl,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = url;
  });
}
