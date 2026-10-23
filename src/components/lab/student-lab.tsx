"use client";

import { DownloadOutlined, PauseOutlined, PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { App, Button, Dropdown, Segmented, Spin, Tour, Typography } from "antd";
import type { TourProps } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivitySheet } from "@/components/lab/activity-sheet";
import { ControlsPanel } from "@/components/lab/controls-panel";
import { LiveChart, StatCards, TimeReadout, type Subscribe } from "@/components/lab/readouts";
import { SimFrame, type SimHandle } from "@/components/lab/sim-frame";
import { SiteHeader } from "@/components/site-header";
import { downloadExport, renderExport, type ExportSnapshot } from "@/lib/export-file";
import type { LabSample } from "@/lib/sandbox/sample";
import { getCustomLab } from "@/lib/storage";
import { defaultControls, labSchema, type ControlMap, type ControlValue, type LabSpec } from "@/lib/spec";

export function StudentLab({
  id,
  builtin,
  previewLab,
}: {
  id: string;
  builtin: LabSpec | null;
  previewLab?: LabSpec | null;
}) {
  const [loaded, setLoaded] = useState<LabSpec | null | undefined>(previewLab ?? builtin ?? undefined);

  useEffect(() => {
    if (previewLab || builtin) return;
    const timer = window.setTimeout(() => {
      const local = getCustomLab(id);
      if (local) {
        setLoaded(local);
        return;
      }
      void fetch(`/api/labs/${id}`)
        .then(async (response) => {
          if (!response.ok) {
            setLoaded(null);
            return;
          }
          const body: unknown = await response.json();
          const record = body && typeof body === "object" && "lab" in body ? (body as { lab: unknown }).lab : null;
          const parsed = labSchema.safeParse(record);
          setLoaded(parsed.success ? parsed.data : null);
        })
        .catch(() => setLoaded(null));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [builtin, id, previewLab]);

  if (loaded === undefined) {
    return (
      <div className="min-h-svh bg-[#f5f5f5]">
        <SiteHeader />
        <div className="flex justify-center py-24">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-svh bg-[#f5f5f5]">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <Typography.Title level={3}>This lab is not on this device</Typography.Title>
          <Typography.Paragraph type="secondary">
            Built-in labs are always open. A teacher can publish a custom lab, or send you a share link.
          </Typography.Paragraph>
        </div>
      </div>
    );
  }

  return <Experiment key={loaded.id} lab={loaded} showSheet={!previewLab} />;
}

export function Experiment({ lab, showSheet }: { lab: LabSpec; showSheet: boolean }) {
  const { message } = App.useApp();
  const [controls, setControls] = useState<ControlMap>(() => defaultControls(lab));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [resetNonce, setResetNonce] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);
  const listeners = useRef(new Set<(sample: LabSample) => void>());
  const controlsRef = useRef(controls);
  const simRef = useRef<SimHandle>(null);
  const snapshotRef = useRef<ExportSnapshot>({
    readouts: [],
    points: [],
    series: null,
    controls,
    time: 0,
  });

  useEffect(() => {
    controlsRef.current = controls;
    snapshotRef.current = { ...snapshotRef.current, controls };
  }, [controls]);

  useEffect(() => {
    document.title = `${lab.title} · Virtual Labs`;
  }, [lab.title]);

  useEffect(() => {
    if (!showSheet) return;
    const timer = window.setTimeout(() => {
      if (!localStorage.getItem(`virtuallabs.tour.${lab.id}`)) setTourOpen(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [lab.id, showSheet]);

  const subscribe = useCallback<Subscribe>((listener) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  const onSample = useCallback((sample: LabSample) => {
    const previous = snapshotRef.current;
    let points = sample.clearChart ? [] : previous.points;
    if (sample.point) {
      const x = Math.round(sample.point.x * 1000) / 1000;
      points = points.filter((point) => Math.abs(point.x - x) > 0.0005);
      points = [...points, { x, y: sample.point.y }];
      if (points.length > 80) points = points.slice(points.length - 80);
    }
    snapshotRef.current = {
      readouts: sample.readouts,
      points,
      series: sample.series ?? (sample.clearChart ? null : previous.series),
      controls: controlsRef.current,
      time: sample.time,
    };
    for (const listener of listeners.current) listener(sample);
  }, []);

  function changeControl(id: string, value: ControlValue) {
    setControls((current) => ({ ...current, [id]: value }));
    const spec = lab.controls.find((control) => control.id === id);
    if (spec && spec.live === false) setResetNonce((nonce) => nonce + 1);
  }

  async function onExport(exportId: string) {
    const item = lab.exports.find((entry) => entry.id === exportId);
    if (!item) return;
    try {
      const pngDataUrl = item.source === "canvas" ? await simRef.current?.capture() : null;
      const file = renderExport(item, lab.chart, { ...snapshotRef.current, pngDataUrl });
      downloadExport(file);
      message.success(`Downloaded ${file.filename}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Export failed.");
    }
  }

  const tourSteps: TourProps["steps"] = lab.tour.map((step) => ({
    title: step.title,
    description: step.body,
    target: () => document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement,
  }));

  return (
    <div className={showSheet ? "min-h-svh bg-[#f5f5f5]" : ""}>
      {showSheet ? <SiteHeader /> : null}
      <div className={showSheet ? "mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-8 lg:px-8" : "flex flex-col gap-6"}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <Typography.Title level={showSheet ? 2 : 4} style={{ margin: 0 }}>
              {lab.title}
            </Typography.Title>
            {showSheet ? (
              <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0", maxWidth: 720 }}>
                {lab.summary}
              </Typography.Paragraph>
            ) : null}
          </div>
          <div data-tour="export">
            <Dropdown
              menu={{
                items: lab.exports.map((item) => ({ key: item.id, label: item.label })),
                onClick: ({ key }) => void onExport(String(key)),
              }}
            >
              <Button icon={<DownloadOutlined />}>Export</Button>
            </Dropdown>
          </div>
        </div>

        {showSheet ? (
          <Typography.Paragraph style={{ fontSize: 16, lineHeight: 1.7, maxWidth: 760, marginBottom: 0 }}>
            {lab.concept}
          </Typography.Paragraph>
        ) : null}

        <div className="grid items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="order-2 lg:order-1">
            <ControlsPanel lab={lab} controls={controls} onChange={changeControl} />
          </div>
          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <StatCards subscribe={subscribe} />
            <section className="overflow-hidden rounded-lg bg-neutral-950">
              <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-3">
                <Button
                  aria-label={playing ? "Pause" : "Play"}
                  icon={playing ? <PauseOutlined /> : <PlayCircleOutlined />}
                  onClick={() => setPlaying((value) => !value)}
                />
                <Button
                  aria-label="Reset simulation"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setPlaying(true);
                    setResetNonce((nonce) => nonce + 1);
                  }}
                />
                <Segmented
                  value={String(speed)}
                  options={[
                    { label: "0.5×", value: "0.5" },
                    { label: "1×", value: "1" },
                    { label: "2×", value: "2" },
                  ]}
                  onChange={(next) => {
                    if (next === "0.5" || next === "1" || next === "2") setSpeed(Number(next));
                  }}
                />
                <TimeReadout subscribe={subscribe} />
              </div>
              <div data-tour="canvas" className="h-[420px] lg:h-[520px]">
                <SimFrame
                  ref={simRef}
                  lab={lab}
                  controls={controls}
                  playing={playing}
                  speed={speed}
                  resetNonce={resetNonce}
                  onSample={onSample}
                />
              </div>
            </section>
            <LiveChart key={resetNonce} chart={lab.chart} subscribe={subscribe} />
          </div>
        </div>
        {showSheet ? <ActivitySheet lab={lab} /> : null}
      </div>
      {showSheet ? (
        <Tour
          open={tourOpen}
          steps={tourSteps}
          onClose={() => {
            setTourOpen(false);
            localStorage.setItem(`virtuallabs.tour.${lab.id}`, "1");
          }}
        />
      ) : null}
    </div>
  );
}
