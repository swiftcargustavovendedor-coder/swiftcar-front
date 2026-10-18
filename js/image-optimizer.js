// Reduz as fotos no navegador antes do upload para economizar armazenamento e egress do Supabase.
// Caminhos novos: "<pasta>/<uuid>.opt.<ext>" (foto) e "<pasta>/<uuid>.thumb.<ext>" (miniatura).
export const IMAGE_CACHE_CONTROL = "max-age=31536000";
export const PHOTO_MAX_SIDE = 1600;
export const THUMB_MAX_SIDE = 480;

const OPTIMIZED_PATH = /\.opt\.(webp|jpg|png)$/;
const EXTENSIONS = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export function thumbPath(path) {
  return OPTIMIZED_PATH.test(path || "") ? path.replace(OPTIMIZED_PATH, ".thumb.$1") : path;
}

export function storagePaths(path) {
  return OPTIMIZED_PATH.test(path || "") ? [path, thumbPath(path)] : [path];
}

async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas, type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));

async function encode(source, maxSide, quality) {
  const width = source.naturalWidth || source.width, height = source.naturalHeight || source.height;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  // Safari antigo não gera WebP no canvas e devolve PNG; nesse caso usa JPEG.
  let blob = await toBlob(canvas, "image/webp", quality);
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
  if (!blob) throw new Error("Não foi possível processar a imagem.");
  return blob;
}

const extensionOf = blob => EXTENSIONS[blob.type] || "jpg";

export async function optimizeImage(file, { maxSide = PHOTO_MAX_SIDE, quality = 0.8, thumbSide = 0, thumbQuality = 0.72 } = {}) {
  const source = await decode(file);
  try {
    let photo = await encode(source, maxSide, quality);
    const thumb = thumbSide ? await encode(source, thumbSide, thumbQuality) : null;
    // Foto original já pequena (dimensão e tamanho): mantém o original se ele for menor.
    const width = source.naturalWidth || source.width, height = source.naturalHeight || source.height;
    if (file.size <= photo.size && Math.max(width, height) <= maxSide && EXTENSIONS[file.type]) photo = file;
    return { photo, thumb, extension: extensionOf(photo) };
  } finally {
    source.close?.();
  }
}
