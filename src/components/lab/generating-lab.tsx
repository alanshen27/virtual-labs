"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Circle, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LabSession } from "@/components/lab/lab-session";
import { CanvasSkeleton, LabFrame, PanelSkeleton } from "@/components/lab/lab-shell";
import { readDraft, type LabDraft } from "@/lib/draft";
import { labSchema, type LabSpec } from "@/lib/spec";
import { saveCustomLab } from "@/lib/storage";

const STEPS = [
  "Understanding concept",
  "Building simulation",
  "Writing explainer",
  "Creating questions",
] as const;

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function GeneratingLab() {
  const router = useRouter();
  const [draft, setDraft] = useState<LabDraft | null | undefined>(undefined);
  const [completed, setCompleted] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lab, setLab] = useState<LabSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(readDraft()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!draft) return;
    let cancelled = false;
    const controller = new AbortController();
    const started = performance.now();
    const timers: number[] = [];
    const advance = window.setInterval(() => {
      setCompleted((count) => (count >= 3 ? count : count + 1));
    }, 800);

    const fail = async (message: string) => {
      const remain = Math.max(0, 2800 - (performance.now() - started));
      await new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, remain));
      });
      if (cancelled) return;
      window.clearInterval(advance);
      setError(message);
    };

    void (async () => {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: draft.prompt,
            subject: draft.subject,
            grade: draft.grade,
          }),
        });
        const payload: unknown = await response.json().catch(() => null);
        const message =
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "The lab could not be generated.";
        if (!response.ok) {
          await fail(message);
          return;
        }
        const parsed = labSchema.safeParse(
          payload && typeof payload === "object" && "lab" in payload ? payload.lab : null,
        );
        if (!parsed.success) {
          await fail("The lab spec came back incomplete.");
          return;
        }
        if (cancelled) return;
        window.clearInterval(advance);
        saveCustomLab(parsed.data);
        setLab(parsed.data);
      } catch (cause) {
        if (cancelled || (cause instanceof DOMException && cause.name === "AbortError")) return;
        await fail(cause instanceof Error ? cause.message : "The lab could not be generated.");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(advance);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [draft]);

  useEffect(() => {
    if (!lab || error) return;
    const timer = window.setInterval(() => {
      setCompleted((count) => (count >= 4 ? count : count + 1));
    }, 450);
    return () => window.clearInterval(timer);
  }, [lab, error]);

  useEffect(() => {
    if (!lab || completed < 4 || error) return;
    const timer = window.setTimeout(() => router.replace(`/lab/${lab.id}`), 500);
    return () => window.clearTimeout(timer);
  }, [lab, completed, error, router]);

  const checklist = (
    <ChecklistCard completed={completed} elapsed={elapsed} failed={Boolean(error)} error={error} />
  );
  const title =
    completed >= 1 && lab ? lab.title : draft?.prompt ? draft.prompt.slice(0, 48) : "Building your lab";

  if (draft === null) {
    return (
      <LabFrame
        title="Building your lab"
        learner={<PanelSkeleton />}
        stage={
          <div className="space-y-4 p-4">
            <Alert>
              <AlertTitle>Start from the home page</AlertTitle>
              <AlertDescription>Type a prompt there and we&apos;ll build the lab on this screen.</AlertDescription>
            </Alert>
            <Button asChild>
              <Link href="/">Back home</Link>
            </Button>
          </div>
        }
        controls={<PanelSkeleton />}
      />
    );
  }

  if (lab && completed >= 2 && !error) {
    const phase = (completed >= 4 ? 4 : completed >= 3 ? 3 : 2) as 2 | 3 | 4;
    return <LabSession lab={lab} phase={phase} banner={completed < 4 ? checklist : null} />;
  }

  return (
    <LabFrame
      title={title}
      learner={<PanelSkeleton lines={8} />}
      stage={
        <div className="space-y-4 p-4">
          {checklist}
          <CanvasSkeleton />
        </div>
      }
      controls={<PanelSkeleton />}
    />
  );
}

function ChecklistCard({
  completed,
  elapsed,
  failed,
  error,
}: {
  completed: number;
  elapsed: number;
  failed: boolean;
  error: string | null;
}) {
  return (
    <Card data-testid="generating-steps">
      <CardHeader>
        <CardTitle>Creating your lab</CardTitle>
        <CardDescription>{formatElapsed(elapsed)} elapsed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-1.5">
          {STEPS.map((label, index) => {
            const done = index < completed;
            const active = index === completed && !failed;
            return (
              <li key={label} className="flex items-center gap-2 text-sm">
                <StepIcon done={done} active={active} />
                <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              </li>
            );
          })}
        </ol>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Generation stopped</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/">Back home</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StepIcon({ done, active }: { done: boolean; active: boolean }): ReactNode {
  if (done) return <Check className="size-4 text-emerald-600" />;
  if (active) return <LoaderCircle className="size-4 animate-spin" />;
  return <Circle className="size-4 text-muted-foreground" />;
}
