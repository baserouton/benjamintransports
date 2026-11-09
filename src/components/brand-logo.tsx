import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/brand-logo.png";
export const BRAND_NAME = "Benjamin Transports";

export function BrandLogo({
  className,
  inverted,
  adaptive = true,
}: {
  className?: string;
  inverted?: boolean;
  adaptive?: boolean;
}) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      className={cn(
        "h-auto w-full object-contain object-left select-none",
        inverted && "brightness-0 invert",
        adaptive && !inverted && "dark:brightness-0 dark:invert",
        className,
      )}
    />
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background text-[11px] font-semibold tracking-tight",
        className,
      )}
      aria-hidden
    >
      BT
    </div>
  );
}
