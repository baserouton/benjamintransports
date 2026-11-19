import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

/** Compacta foto grande de celular/iPad para caber no upload. */
export async function fileToUploadDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie uma foto (JPG, PNG ou WEBP)");
  }
  const dataUrl = await fileToDataUrl(file);
  if (dataUrl.length <= 6_500_000) return dataUrl;
  return compressImageFile(file);
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(src);
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível compactar a imagem"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("Não foi possível ler a foto"));
    };
    img.src = src;
  });
}

export function DocumentPhoto({
  label,
  url,
  onFile,
  onRemove,
  busy,
  hint,
}: {
  label: string;
  url?: string;
  onFile: (file: File) => void;
  onRemove?: () => void;
  busy?: boolean;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    onFile(file);
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {url ? (
        <div className="rounded-md border border-border overflow-hidden bg-muted/30">
          <button
            type="button"
            className="block w-full"
            onClick={() => setOpen(true)}
            disabled={busy}
          >
            <img
              src={url}
              alt={label}
              className="w-full max-h-52 object-contain bg-white"
            />
          </button>
          <div className="flex flex-wrap gap-1 p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setOpen(true)}
              disabled={busy}
            >
              Ver documento
            </Button>
            <label className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  pick(e.target.files);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex h-8 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium cursor-pointer hover:bg-muted/50">
                {busy ? "Enviando…" : "Trocar foto"}
              </span>
            </label>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRemove}
                disabled={busy}
                aria-label="Remover foto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-6 cursor-pointer hover:bg-muted/40 min-h-36">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground text-center">
            {busy ? "Enviando…" : (hint ?? "Toque para fotografar ou escolher a imagem")}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          {url && (
            <img
              src={url}
              alt={label}
              className="w-full max-h-[75vh] object-contain bg-white rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
