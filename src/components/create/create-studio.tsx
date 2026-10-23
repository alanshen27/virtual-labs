"use client";

import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { Button, Flex, Heading, Spinner, Switch, Text, TextArea, TextField } from "@radix-ui/themes";
import { useState } from "react";
import { Experiment } from "@/components/lab/student-lab";
import { useNotice } from "@/components/notice";
import { SiteHeader } from "@/components/site-header";
import { labSchema, type LabSpec } from "@/lib/spec";

type ChatLine = { role: "user" | "assistant"; content: string };

const WELCOME =
  "Describe the visualisation you want. You can name export formats in the same breath, for example “CSV of the trajectory and a PNG of the canvas”. Say “start from the pendulum lab” to remix a built-in, then keep chatting to change it.";

const PRESET_FORMATS = ["csv", "png", "json"] as const;

export function CreateStudio() {
  const notice = useNotice();
  const [lines, setLines] = useState<ChatLine[]>([{ role: "assistant", content: WELCOME }]);
  const [draft, setDraft] = useState("");
  const [formats, setFormats] = useState<string[]>([]);
  const [customFormat, setCustomFormat] = useState("");
  const [lab, setLab] = useState<LabSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function send() {
    const text = draft.trim();
    if (text.length < 8 || busy) return;
    setDraft("");
    setLines((current) => [...current, { role: "user", content: text }]);
    setBusy(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, lab, formats }),
      });
      const body: unknown = await response.json().catch(() => null);
      const error =
        body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : null;
      if (!response.ok) {
        setLines((current) => [...current, { role: "assistant", content: error ?? "The lab could not be updated." }]);
        return;
      }
      const next = body && typeof body === "object" && "lab" in body ? labSchema.safeParse(body.lab) : null;
      const note = body && typeof body === "object" && "note" in body && typeof body.note === "string" ? body.note : null;
      if (!next?.success) {
        setLines((current) => [...current, { role: "assistant", content: "The reply was not a valid lab." }]);
        return;
      }
      setLab(next.data);
      setSavedId(null);
      setLines((current) => [
        ...current,
        {
          role: "assistant",
          content: note ?? `Updated “${next.data.title}”. The preview on the right is the student simulation.`,
        },
      ]);
    } catch {
      setLines((current) => [...current, { role: "assistant", content: "The request did not finish." }]);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!lab) return;
    const response = await fetch("/api/labs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lab, published }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "Save failed.";
      notice.error(error);
      return;
    }
    const saved = body && typeof body === "object" && "lab" in body ? labSchema.safeParse(body.lab) : null;
    if (saved?.success) {
      setLab(saved.data);
      setSavedId(saved.data.id);
      notice.success(published ? "Saved. Students can open it from Explore." : "Saved to your account.");
    }
  }

  function toggleFormat(format: string) {
    setFormats((current) => (current.includes(format) ? current.filter((item) => item !== format) : [...current, format]));
  }

  function addCustomFormat() {
    const next = customFormat.trim().toLowerCase();
    if (!next) return;
    setFormats((current) => (current.includes(next) ? current : [...current, next]));
    setCustomFormat("");
  }

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
        <section className="flex min-h-[70vh] flex-col border-[var(--gray-a5)] bg-[var(--color-panel-solid)] lg:border-r">
          <div className="border-b border-[var(--gray-a5)] px-6 py-5">
            <Heading size="5">Design chat</Heading>
            <Text as="p" color="gray" mt="2">
              Ask for a lab, then revise it. The preview updates when a reply comes back.
            </Text>
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
            {lines.map((line, index) => (
              <div
                key={`${line.role}-${index}`}
                className={
                  line.role === "user"
                    ? "ml-8 rounded-lg bg-[var(--accent-3)] px-4 py-3"
                    : "mr-8 rounded-lg bg-[var(--gray-3)] px-4 py-3"
                }
              >
                <Text as="p" color="gray" size="1" mb="1">
                  {line.role === "user" ? "You" : "Assistant"}
                </Text>
                <Text as="p" style={{ whiteSpace: "pre-wrap" }}>
                  {line.content}
                </Text>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--gray-a5)] px-6 py-5">
            <TextArea
              value={draft}
              size="3"
              rows={3}
              placeholder="Make gravity a slider, and export a CSV of the trajectory"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <Flex mt="4" gap="3" wrap="wrap" align="center">
              <Flex gap="2" wrap="wrap" align="center" style={{ flex: 1 }}>
                {PRESET_FORMATS.map((format) => {
                  const selected = formats.includes(format);
                  return (
                    <Button
                      key={format}
                      type="button"
                      size="2"
                      variant={selected ? "solid" : "soft"}
                      color={selected ? undefined : "gray"}
                      onClick={() => toggleFormat(format)}
                    >
                      {format.toUpperCase()}
                    </Button>
                  );
                })}
                {formats
                  .filter((format) => !PRESET_FORMATS.includes(format as (typeof PRESET_FORMATS)[number]))
                  .map((format) => (
                    <Button key={format} type="button" size="2" variant="solid" onClick={() => toggleFormat(format)}>
                      {format}
                    </Button>
                  ))}
                <TextField.Root
                  size="2"
                  placeholder="Add format"
                  value={customFormat}
                  style={{ width: 120 }}
                  onChange={(event) => setCustomFormat(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomFormat();
                    }
                  }}
                />
              </Flex>
              <Button size="3" disabled={busy} onClick={() => void send()}>
                {busy ? <Spinner /> : <PaperPlaneIcon />}
                Send
              </Button>
            </Flex>
          </div>
        </section>
        <section className="px-6 py-6 lg:px-8">
          <Flex mb="6" gap="4" wrap="wrap" align="center">
            <Heading size="5">Student preview</Heading>
            <Flex ml="auto" gap="4" wrap="wrap" align="center">
              <Flex align="center" gap="3">
                <Switch id="publish-lab" checked={published} onCheckedChange={setPublished} />
                <Text as="label" htmlFor="publish-lab" style={{ cursor: "pointer" }}>
                  Students can open this
                </Text>
              </Flex>
              <Button size="3" disabled={!lab} onClick={() => void save()}>
                Save
              </Button>
              {savedId ? (
                <Button size="3" variant="soft" color="gray" asChild>
                  <a href={`/lab/${savedId}`}>Open student view</a>
                </Button>
              ) : null}
            </Flex>
          </Flex>
          {lab ? (
            <Experiment key={lab.id + lab.title} lab={lab} showSheet={false} />
          ) : (
            <div className="flex min-h-[480px] items-center justify-center rounded-lg bg-[var(--color-panel-solid)] px-8">
              <Text color="gray" align="center" style={{ maxWidth: 360, lineHeight: 1.6 }}>
                Describe a lab in the chat. The simulation will show up here.
              </Text>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
