"use client";

import { SendOutlined } from "@ant-design/icons";
import { App, Button, Empty, Input, Select, Switch, Typography } from "antd";
import { useState } from "react";
import { Experiment } from "@/components/lab/student-lab";
import { SiteHeader } from "@/components/site-header";
import { labSchema, type LabSpec } from "@/lib/spec";

type ChatLine = { role: "user" | "assistant"; content: string };

const WELCOME =
  "Describe the visualisation you want. You can name export formats in the same breath, for example “CSV of the trajectory and a PNG of the canvas”. Say “start from the pendulum lab” to remix a built-in, then keep chatting to change it.";

export function CreateStudio() {
  const { message } = App.useApp();
  const [lines, setLines] = useState<ChatLine[]>([{ role: "assistant", content: WELCOME }]);
  const [draft, setDraft] = useState("");
  const [formats, setFormats] = useState<string[]>([]);
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
      message.error(error);
      return;
    }
    const saved = body && typeof body === "object" && "lab" in body ? labSchema.safeParse(body.lab) : null;
    if (saved?.success) {
      setLab(saved.data);
      setSavedId(saved.data.id);
      message.success(published ? "Saved. Students can open it from Explore." : "Saved to your account.");
    }
  }

  return (
    <div className="min-h-svh bg-[#f5f5f5]">
      <SiteHeader />
      <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
        <section className="flex min-h-[70vh] flex-col border-neutral-200 bg-white lg:border-r">
          <div className="border-b border-neutral-200 px-6 py-5">
            <Typography.Title level={4} style={{ margin: 0 }}>
              Design chat
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
              Ask for a lab, then revise it. The preview updates when a reply comes back.
            </Typography.Paragraph>
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
            {lines.map((line, index) => (
              <div
                key={`${line.role}-${index}`}
                className={line.role === "user" ? "ml-8 rounded-lg bg-[#e6f4ff] px-4 py-3" : "mr-8 rounded-lg bg-neutral-100 px-4 py-3"}
              >
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                  {line.role === "user" ? "You" : "Assistant"}
                </Typography.Text>
                <Typography.Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>{line.content}</Typography.Paragraph>
              </div>
            ))}
          </div>
          <div className="border-t border-neutral-200 px-6 py-5">
            <Input.TextArea
              value={draft}
              rows={3}
              placeholder="Make gravity a slider, and export a CSV of the trajectory"
              onChange={(event) => setDraft(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Select
                mode="tags"
                value={formats}
                placeholder="Export formats"
                style={{ minWidth: 180, flex: 1 }}
                onChange={setFormats}
                options={[
                  { value: "csv", label: "CSV" },
                  { value: "png", label: "PNG" },
                  { value: "json", label: "JSON" },
                ]}
              />
              <Button type="primary" icon={<SendOutlined />} loading={busy} onClick={() => void send()}>
                Send
              </Button>
            </div>
          </div>
        </section>
        <section className="px-6 py-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <Typography.Title level={4} style={{ margin: 0 }}>
              Student preview
            </Typography.Title>
            <div className="ml-auto flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-3">
                <Switch checked={published} onChange={setPublished} />
                <span className="cursor-pointer" onClick={() => setPublished((value) => !value)}>
                  Students can open this
                </span>
              </span>
              <Button type="primary" disabled={!lab} onClick={() => void save()}>
                Save
              </Button>
              {savedId ? (
                <a href={`/lab/${savedId}`}>
                  <Button>Open student view</Button>
                </a>
              ) : null}
            </div>
          </div>
          {lab ? (
            <Experiment key={lab.id + lab.title} lab={lab} showSheet={false} />
          ) : (
            <div className="flex min-h-[480px] items-center justify-center rounded-lg bg-white">
              <Empty description="Describe a lab in the chat. The simulation will show up here." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
