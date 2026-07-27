"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "soft";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-surface hover:brightness-110 shadow-cozy disabled:opacity-40",
  soft: "bg-surface-2 text-ink hover:bg-accent-soft disabled:opacity-40",
  ghost: "bg-transparent text-ink-soft hover:text-ink disabled:opacity-40",
};

export function CozyButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-full px-6 py-3 font-semibold transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
