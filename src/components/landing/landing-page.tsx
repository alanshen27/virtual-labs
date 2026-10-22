"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ChevronRight, FlaskConical } from "lucide-react";
import { LabThumb } from "@/components/landing/thumbs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { builtinIdForPrompt, gallerySections, grades, subjects, suggestions, type Grade, type Subject } from "@/lib/catalog";
import { saveDraft } from "@/lib/draft";
import { getBuiltinLab } from "@/lib/labs";
import { loadCustomLabs } from "@/lib/storage";
import type { LabSpec } from "@/lib/spec";

export function LandingPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState<Subject>("Any");
  const [grade, setGrade] = useState<Grade>("High school");
  const [generationEnabled, setGenerationEnabled] = useState<boolean | null>(null);
  const [customLabs, setCustomLabs] = useState<LabSpec[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/status")
      .then((response) => response.json())
      .then((payload: { generationEnabled?: boolean }) => {
        if (!cancelled) setGenerationEnabled(payload.generationEnabled === true);
      })
      .catch(() => {
        if (!cancelled) setGenerationEnabled(false);
      });
    const timer = window.setTimeout(() => {
      if (!cancelled) setCustomLabs(loadCustomLabs());
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const canSend = prompt.trim().length >= 8;

  function openPrompt(nextPrompt: string, nextSubject: Subject) {
    const match = builtinIdForPrompt(nextPrompt);
    if (match) {
      router.push(`/lab/${match}`);
      return;
    }
    saveDraft({ prompt: nextPrompt.trim(), subject: nextSubject, grade });
    router.push("/lab/new");
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-20 flex h-14 items-center border-b bg-background px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium">
          <FlaskConical className="size-5" />
          Virtual Labs
        </Link>
      </header>
      <main className="px-4 py-12 md:py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">What do you want to explore?</h1>
          <form
            className="mt-8 w-full"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSend) return;
              openPrompt(prompt, subject);
            }}
          >
            <Card className="text-left shadow-sm">
              <CardContent className="px-3 py-3">
                <Textarea
                  data-testid="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      if (canSend) openPrompt(prompt, subject);
                    }
                  }}
                  placeholder="Show me how pendulum length affects the period"
                  className="min-h-28 resize-none border-0 px-2 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Select value={subject} onValueChange={(value) => setSubject(value as Subject)}>
                    <SelectTrigger size="sm" aria-label="Subject" className="w-[9.5rem]">
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={grade} onValueChange={(value) => setGrade(value as Grade)}>
                    <SelectTrigger size="sm" aria-label="Grade level" className="w-[10.5rem]">
                      <SelectValue placeholder="Grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    size="icon"
                    className="ml-auto size-10 rounded-full"
                    disabled={!canSend}
                    aria-label="Create lab"
                  >
                    <ArrowUp />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {suggestions.map((item) => (
              <Button
                key={item.label}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-background"
                onClick={() => {
                  setPrompt(item.prompt);
                  setSubject(item.subject);
                  openPrompt(item.prompt, item.subject);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {generationEnabled === false ? (
            <Alert className="mt-6 text-left">
              <AlertTitle>Built-in labs are ready</AlertTitle>
              <AlertDescription>
                Custom generation needs an OPENAI_API_KEY. You can still open every lab in the gallery below.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-12">
          {customLabs.length > 0 ? (
            <GalleryRow
              title="Your labs"
              subtitle="Generated in this browser."
              labs={customLabs}
              exploreHref={`/lab/${customLabs[0]?.id ?? ""}`}
            />
          ) : null}
          {gallerySections.map((section) => {
            const labs = section.labIds
              .map((id) => getBuiltinLab(id))
              .filter((lab): lab is LabSpec => Boolean(lab));
            if (labs.length === 0) return null;
            return (
              <GalleryRow
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                labs={labs}
                exploreHref={`/lab/${labs[0]?.id ?? ""}`}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}

function GalleryRow({
  title,
  subtitle,
  labs,
  exploreHref,
}: {
  title: string;
  subtitle: string;
  labs: LabSpec[];
  exploreHref: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="text-left">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={exploreHref}>
            Explore
            <ChevronRight />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {labs.map((lab) => (
          <Link key={lab.id} href={`/lab/${lab.id}`} className="text-left">
            <Card className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
              <div className="aspect-[16/10] bg-muted">
                <LabThumb id={lab.id} />
              </div>
              <CardContent className="space-y-1 px-3 py-3">
                <CardTitle className="text-sm">{lab.title}</CardTitle>
                <p className="line-clamp-2 text-xs text-muted-foreground">{lab.summary}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
