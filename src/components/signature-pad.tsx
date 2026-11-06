import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };

export function SignaturePad({
  hint,
  clearLabel,
  confirmLabel,
  confirming,
  onConfirm,
  onEmpty,
}: {
  hint: string;
  clearLabel: string;
  confirmLabel: string;
  confirming?: boolean;
  onConfirm: (dataUrl: string) => void;
  onEmpty?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inked = useRef(false);
  const last = useRef<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const nextW = Math.max(1, Math.round(rect.width * dpr));
      const nextH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width === nextW && canvas.height === nextH) return;
      const prev = canvas.toDataURL();
      canvas.width = nextW;
      canvas.height = nextH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (inked.current) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.src = prev;
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const point = (e: PointerEvent, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width || e.offsetX * dpr,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height || e.offsetY * dpr,
    };
  };

  const stroke = (from: Point, to: Point) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = Math.max(3, canvasRef.current!.width / 220);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    inked.current = true;
    last.current = point(e.nativeEvent, canvas);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const next = point(e.nativeEvent, e.currentTarget);
    stroke(last.current, next);
    last.current = next;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    last.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    inked.current = false;
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !inked.current) {
      onEmpty?.();
      return;
    }
    onConfirm(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        className="w-full h-[280px] md:h-[360px] touch-none cursor-crosshair rounded-md border-2 border-foreground bg-white"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={clear} disabled={confirming}>
          {clearLabel}
        </Button>
        <Button type="button" onClick={confirm} disabled={confirming}>
          {confirming ? "…" : confirmLabel}
        </Button>
      </div>
    </div>
  );
}
