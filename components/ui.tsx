import Link from "next/link";
import type { ReactNode } from "react";

export const Container = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-6xl px-5 ${className}`}>{children}</div>
);

export const Eyebrow = ({ children }: { children: ReactNode }) => <p className="eyebrow">{children}</p>;

export const H1 = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <h1 className={`font-display text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-ink sm:text-6xl ${className}`}>{children}</h1>
);
export const H2 = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <h2 className={`font-display text-3xl leading-tight tracking-[-0.015em] text-ink sm:text-4xl ${className}`}>{children}</h2>
);

export const Card = ({ children, className = "", ...rest }: { children: ReactNode; className?: string } & Record<string, unknown>) => (
  <div className={`card ${className}`} {...rest}>{children}</div>
);

export function Button({ children, variant = "primary", className = "", href, ...rest }:
  { children: ReactNode; variant?: "primary" | "ink" | "ghost"; className?: string; href?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `btn btn-${variant} ${className}`;
  if (href) return <Link href={href as never} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

export const Stamp = ({ children }: { children: ReactNode }) => <span className="stamp">{children}</span>;

export const Rule = ({ className = "" }: { className?: string }) => <div className={`rule ${className}`} />;
