"use client";

import { Heading, Text, TextArea, TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import type { LabSpec } from "@/lib/spec";

function storageKey(id: string): string {
  return `virtuallabs.sheet.${id}`;
}

export function ActivitySheet({ lab }: { lab: LabSpec }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey(lab.id));
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        const next: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string") next[key] = value;
        }
        setAnswers(next);
      } catch {
        setAnswers({});
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [lab.id]);

  function update(id: string, value: string) {
    setAnswers((current) => {
      const next = { ...current, [id]: value };
      localStorage.setItem(storageKey(lab.id), JSON.stringify(next));
      return next;
    });
  }

  return (
    <section data-tour="activity" className="rounded-lg bg-[var(--color-panel-solid)] px-6 py-6">
      <Heading size="4" mb="2">
        {lab.activity.title}
      </Heading>
      {lab.activity.intro ? (
        <Text as="p" color="gray" style={{ lineHeight: 1.6 }}>
          {lab.activity.intro}
        </Text>
      ) : null}
      <ol className="mt-6 flex flex-col gap-8">
        {lab.activity.items.map((item, index) => (
          <li key={item.id}>
            <Text as="p" size="3">
              {index + 1}. {item.prompt}
            </Text>
            {item.kind === "observation" ? (
              <TextArea
                mt="3"
                size="3"
                rows={3}
                value={answers[item.id] ?? ""}
                placeholder={item.placeholder}
                onChange={(event) => update(item.id, event.target.value)}
              />
            ) : (
              <TextField.Root
                mt="3"
                size="3"
                value={answers[item.id] ?? ""}
                placeholder={item.placeholder}
                onChange={(event) => update(item.id, event.target.value)}
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
