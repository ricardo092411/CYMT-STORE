import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { statusLabels, type ProductStatus } from "@/data/catalog";

/* ------------------------------ Button ------------------------------ */

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const sizeMap: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-8 text-sm",
};

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-bright shadow-[0_10px_30px_-12px_rgba(229,9,20,0.7)] hover:shadow-[0_14px_44px_-12px_rgba(229,9,20,0.9)] hover:-translate-y-0.5",
  secondary:
    "bg-surface-2 text-ink border border-line hover:bg-surface-3 hover:border-line-strong",
  outline: "border border-line-strong text-ink hover:bg-surface-2",
  ghost: "text-ink-soft hover:text-ink hover:bg-surface-2",
  link: "text-ink underline-offset-4 hover:text-brand px-0 h-auto",
};

/** Class string for the button look — usable on <Link> / <a> too. */
export function buttonVariants(opts: { variant?: ButtonVariant; size?: ButtonSize } = {}) {
  const { variant = "primary", size = "md" } = opts;
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap",
    sizeMap[size],
    variantMap[variant],
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

/* ------------------------------ Badge ------------------------------- */

type BadgeTone = "default" | "brand" | "muted" | "soft";

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    default: "bg-surface-2 text-ink-soft border border-line",
    brand: "bg-brand text-white",
    muted: "bg-surface-3 text-ink-muted",
    soft: "bg-brand-soft text-brand border border-brand/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  const map: Record<ProductStatus, { tone: BadgeTone; label: string }> = {
    nuevo: { tone: "soft", label: statusLabels.nuevo },
    oferta: { tone: "brand", label: statusLabels.oferta },
    limitada: { tone: "default", label: statusLabels.limitada },
    agotado: { tone: "muted", label: statusLabels.agotado },
  };
  const { tone, label } = map[status];
  return (
    <Badge tone={tone} className={cn(status === "limitada" && "border-brand/40 text-brand", className)}>
      {label}
    </Badge>
  );
}

/* ------------------------------ Price ------------------------------- */

export function Price({
  price,
  compareAtPrice,
  className,
}: {
  price: number;
  compareAtPrice?: number;
  className?: string;
}) {
  const onSale = !!compareAtPrice && compareAtPrice > price;
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-display font-semibold text-ink", onSale && "text-brand")}>
        {formatPrice(price)}
      </span>
      {onSale && (
        <span className="text-xs text-ink-faint line-through">
          {formatPrice(compareAtPrice as number)}
        </span>
      )}
    </div>
  );
}

/* ---------------------------- Containers ---------------------------- */

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("container-x", className)}>{children}</div>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-balance text-3xl font-bold leading-[1.05] md:text-4xl lg:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-xl text-ink-muted md:text-lg">{description}</p>
        )}
      </div>
      {action && <div className={cn(align === "center" && "mx-auto")}>{action}</div>}
    </div>
  );
}
