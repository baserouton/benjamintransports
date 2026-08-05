import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 10;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function uploadsRoot() {
  return path.resolve(process.cwd(), "uploads");
}

export function resolveUploadPath(urlPath: string) {
  const relative = urlPath.replace(/^\/uploads\/?/, "");
  if (!relative || relative.includes("..") || path.isAbsolute(relative)) {
    return null;
  }
  const full = path.resolve(uploadsRoot(), relative);
  if (!full.startsWith(uploadsRoot() + path.sep) && full !== uploadsRoot()) {
    return null;
  }
  return full;
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Formato de imagem inválido");
  const mime = match[1].toLowerCase();
  const ext = ALLOWED[mime];
  if (!ext) throw new Error(`Tipo de imagem não permitido: ${mime}`);
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) throw new Error("Arquivo de imagem vazio");
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Imagem acima de ${MAX_BYTES / (1024 * 1024)} MB`);
  }
  return { buffer, ext, mime };
}

export async function saveVehiclePhotoDataUrls(dataUrls: string[]) {
  if (dataUrls.length > MAX_FILES) {
    throw new Error(`Máximo de ${MAX_FILES} fotos por veículo`);
  }

  const dir = path.join(uploadsRoot(), "vehicles");
  await mkdir(dir, { recursive: true });

  const urls: string[] = [];
  for (const dataUrl of dataUrls) {
    const { buffer, ext } = parseDataUrl(dataUrl);
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 12);
    const name = `${Date.now()}-${randomBytes(4).toString("hex")}-${hash}.${ext}`;
    await writeFile(path.join(dir, name), buffer);
    urls.push(`/uploads/vehicles/${name}`);
  }
  return urls;
}
