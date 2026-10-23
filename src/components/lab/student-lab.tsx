"use client";

import { DownloadIcon, PauseIcon, PlayIcon, ReloadIcon } from "@radix-ui/react-icons";
import { Button, DropdownMenu, Flex, Heading, IconButton, SegmentedControl, Spinner, Text } from "@radix-ui/themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivitySheet } from "@/components/lab/activity-sheet";
import { ControlsPanel } from "@/components/lab/controls-panel";
import { GuidedTour } from "@/components/lab/guided-tour";
import { LiveChart, StatCards, TimeReadout, type Subscribe } from "@/components/lab/readouts";
import { SimFrame, type SimHandle } from "@/components/lab/sim-frame";
import { useNotice } from "@/components/notice";
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
      <div className="min-h-svh">
        <SiteHeader />
        <div className="flex justify-center py-24">
          <Spinner size="3" />
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-svh">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <Heading size="6" mb="2">
            This lab is not on this device
          </Heading>
          <Text as="p" color="gray">
            Built-in labs are always open. A teacher can publish a custom lab, or send you a share link.
          </Text>
        </div>
      </div>
    );
  }

  return <Experiment key={loaded.id} lab={loaded} showSheet={!previewLab} />;
}

export function Experiment({ lab, showSheet }: { lab: LabSpec; showSheet: boolean }) {
  const notice = useNotice();
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

  function closeTour() {
    setTourOpen(false);
    localStorage.setItem(`virtuallabs.tour.${lab.id}`, "1");
  }

  async function onExport(exportId: string) {
    const item = lab.exports.find((entry) => entry.id === exportId);
    if (!item) return;
    try {
      const pngDataUrl = item.source === "canvas" ? await simRef.current?.capture() : null;
      const file = renderExport(item, lab.chart, { ...snapshotRef.current, pngDataUrl });
      downloadExport(file);
      notice.success(`Downloaded ${file.filename}`);
    } catch (error) {
      notice.error(error instanceof Error ? error.message : "Export failed.");
    }
  }

  return (
    <div className={showSheet ? "min-h-svh" : ""}>
      {showSheet ? <SiteHeader /> : null}
      <div className={showSheet ? "mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-8 lg:px-8" : "flex flex-col gap-6"}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <Heading size={showSheet ? "7" : "5"}>{lab.title}</Heading>
            {showSheet ? (
              <Text as="p" color="gray" mt="2" style={{ maxWidth: 720, lineHeight: 1.6 }}>
                {lab.summary}
              </Text>
            ) : null}
          </div>
          <div data-tour="export">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="soft" color="gray">
                  <DownloadIcon />
                  Export
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                {lab.exports.map((item) => (
                  <DropdownMenu.Item key={item.id} onSelect={() => void onExport(item.id)}>
                    {item.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>

        {showSheet ? (
          <Text as="p" size="3" style={{ lineHeight: 1.7, maxWidth: 760 }}>
            {lab.concept}
          </Text>
        ) : null}

        <div className="grid items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="order-2 lg:order-1">
            <ControlsPanel lab={lab} controls={controls} onChange={changeControl} />
          </div>
          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <StatCards subscribe={subscribe} />
            <section className="overflow-hidden rounded-lg bg-neutral-950">
              <Flex align="center" gap="3" wrap="wrap" className="bg-[var(--color-panel-solid)] px-4 py-3">
                <IconButton
                  aria-label={playing ? "Pause" : "Play"}
                  variant="soft"
                  color="gray"
                  size="3"
                  onClick={() => setPlaying((value) => !value)}
                >
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </IconButton>
                <IconButton
                  aria-label="Reset simulation"
                  variant="soft"
                  color="gray"
                  size="3"
                  onClick={() => {
                    setPlaying(true);
                    setResetNonce((nonce) => nonce + 1);
                  }}
                >
                  <ReloadIcon />
                </IconButton>
                <SegmentedControl.Root
                  value={String(speed)}
                  onValueChange={(next) => {
                    if (next === "0.5" || next === "1" || next === "2") setSpeed(Number(next));
                  }}
                >
                  <SegmentedControl.Item value="0.5">0.5×</SegmentedControl.Item>
                  <SegmentedControl.Item value="1">1×</SegmentedControl.Item>
                  <SegmentedControl.Item value="2">2×</SegmentedControl.Item>
                </SegmentedControl.Root>
                <TimeReadout subscribe={subscribe} />
              </Flex>
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
      {showSheet ? <GuidedTour open={tourOpen} steps={lab.tour} onClose={closeTour} /> : null}
    </div>
  );
}
