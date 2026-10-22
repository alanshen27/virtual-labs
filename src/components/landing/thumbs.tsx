import type { ReactNode } from "react";

export function LabThumb({ id }: { id: string }) {
  if (id === "pendulum") return <PendulumThumb />;
  if (id === "projectile") return <ProjectileThumb />;
  if (id === "ideal-gas") return <GasThumb />;
  if (id === "ohms-law") return <CircuitThumb />;
  if (id === "interference") return <WaveThumb />;
  return <GenericThumb />;
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" role="img" aria-hidden="true">
      <rect width="320" height="200" className="fill-muted" />
      {children}
    </svg>
  );
}

function PendulumThumb() {
  return (
    <Frame>
      <line x1="160" y1="28" x2="214" y2="128" className="stroke-foreground" strokeWidth="3" />
      <circle cx="214" cy="136" r="16" className="fill-primary" />
      <line x1="120" y1="28" x2="200" y2="28" className="stroke-foreground" strokeWidth="4" />
    </Frame>
  );
}

function ProjectileThumb() {
  return (
    <Frame>
      <path d="M36 150 C 90 150, 110 40, 250 150" className="stroke-primary" strokeWidth="3" fill="none" />
      <circle cx="168" cy="78" r="8" className="fill-primary" />
      <line x1="24" y1="156" x2="296" y2="156" className="stroke-foreground/40" strokeWidth="2" />
    </Frame>
  );
}

function GasThumb() {
  return (
    <Frame>
      <rect x="78" y="36" width="164" height="128" rx="8" className="fill-background stroke-foreground" strokeWidth="3" />
      <rect x="78" y="36" width="164" height="18" className="fill-primary" />
      <circle cx="130" cy="100" r="7" className="fill-chart-2" />
      <circle cx="168" cy="124" r="7" className="fill-primary" />
      <circle cx="198" cy="92" r="7" className="fill-foreground" />
      <circle cx="150" cy="78" r="6" className="fill-chart-3" />
    </Frame>
  );
}

function CircuitThumb() {
  return (
    <Frame>
      <rect x="70" y="48" width="180" height="104" rx="6" className="fill-none stroke-foreground" strokeWidth="3" />
      <path d="M150 48 l8 16 l-16 8 l16 8 l-16 8 l8 16" className="stroke-primary" strokeWidth="3" fill="none" />
      <circle cx="250" cy="100" r="14" className="fill-primary/30 stroke-primary" strokeWidth="3" />
    </Frame>
  );
}

function WaveThumb() {
  return (
    <Frame>
      <path
        d="M30 110 C 50 70, 70 70, 90 110 S 130 150, 150 110 S 190 70, 210 110 S 250 150, 290 110"
        className="stroke-primary"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M30 110 C 50 150, 70 150, 90 110 S 130 70, 150 110 S 190 150, 210 110 S 250 70, 290 110"
        className="stroke-foreground"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />
    </Frame>
  );
}

function GenericThumb() {
  return (
    <Frame>
      <circle cx="160" cy="100" r="36" className="fill-primary/20 stroke-primary" strokeWidth="3" />
    </Frame>
  );
}
