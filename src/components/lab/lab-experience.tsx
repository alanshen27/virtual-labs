"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LabSession } from "@/components/lab/lab-session";
import { CanvasSkeleton, LabFrame, PanelSkeleton } from "@/components/lab/lab-shell";
import { getCustomLab } from "@/lib/storage";
import type { LabSpec } from "@/lib/spec";

export function LabExperience({ id, builtin }: { id: string; builtin: LabSpec | null }) {
  const [lab, setLab] = useState<LabSpec | null>(builtin);
  const [ready, setReady] = useState(Boolean(builtin));

  useEffect(() => {
    if (builtin) return;
    const timer = window.setTimeout(() => {
      setLab(getCustomLab(id));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [builtin, id]);

  useEffect(() => {
    if (!ready) document.title = "Loading lab · Virtual Labs";
  }, [ready]);

  if (!ready) {
    return (
      <LabFrame
        title="Loading lab"
        learner={<PanelSkeleton />}
        stage={<CanvasSkeleton />}
        controls={<PanelSkeleton />}
      />
    );
  }

  if (!lab) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-medium">This lab isn&apos;t on this device</h1>
        <p className="text-sm text-muted-foreground">
          Built-in labs are always available. A generated lab stays in this browser, or you can open it again from a
          share link.
        </p>
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  return <LabSession key={lab.id} lab={lab} />;
}
