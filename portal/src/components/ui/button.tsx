import Link from "next/link";
import { cn } from "@/lib/ui/cn";

const variants = {
  primary:
    "bg-oak-orange text-white hover:bg-orange-600 focus-visible:ring-oak-orange/40",
  secondary:
    "border border-oak-border bg-white text-oak-charcoal hover:bg-slate-50 focus-visible:ring-oak-border",
  danger:
    "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 focus-visible:ring-red-200",
  ghost:
    "text-oak-charcoal hover:bg-slate-100 focus-visible:ring-oak-border",
} as const;

const base =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

type ButtonProps = {
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
} & (
  | React.ButtonHTMLAttributes<HTMLButtonElement>
  | { href: string } & Omit<React.ComponentProps<typeof Link>, "className">
);

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(base, variants[variant], className);

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props;
    const isExternalApi = href.startsWith("/api/");
    if (isExternalApi) {
      return (
        <a href={href} className={classes} {...(linkProps as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
