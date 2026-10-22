"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Pause, Play, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ControlDeck } from "@/components/lab/control-deck";
import { LabFrame, PanelSkeleton } from "@/components/lab/lab-shell";
import { LearnerPanel } from "@/components/lab/learner-panel";
import { LiveChart, StatCards, TimeReadout, type Subscribe } from "@/components/lab/readouts";
import { SimFrame } from "@/components/lab/sim-frame";
import type { LabSample } from "@/lib/sandbox/sample";
import { shareUrl } from "@/lib/share";
import { defaultControls, type ControlMap, type ControlValue, type LabSpec } from "@/lib/spec";

export function LabSession({
  lab,
  phase = 4,
  banner,
}: {
  lab: LabSpec;
  phase?: 2 | 3 | 4;
  banner?: ReactNode;
}) {
  const [controls, setControls] = useState<ControlMap>(() => defaultControls(lab));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [resetNonce, setResetNonce] = useState(0);
  const listeners = useRef(new Set<(sample: LabSample) => void>());

  const subscribe = useCallback<Subscribe>((listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const onSample = useCallback((sample: LabSample) => {
    for (const listener of listeners.current) listener(sample);
  }, []);

  useEffect(() => {
    document.title = `${lab.title} · Virtual Labs`;
  }, [lab.title]);

  function changeControl(id: string, value: ControlValue) {
    setControls((current) => ({ ...current, [id]: value }));
    const spec = lab.controls.find((control) => control.id === id);
    if (spec && spec.live === false) setResetNonce((nonce) => nonce + 1);
  }

  function resetSim() {
    setPlaying(true);
    setResetNonce((nonce) => nonce + 1);
  }

  function resetDefaults() {
    setControls(defaultControls(lab));
    setPlaying(true);
    setResetNonce((nonce) => nonce + 1);
  }

  function testPrediction() {
    setPlaying(true);
    setResetNonce((nonce) => nonce + 1);
  }

  return (
    <LabFrame
      title={lab.title}
      actions={<ShareButton lab={lab} />}
      learner={
        phase >= 3 ? (
          <LearnerPanel lab={lab} showQuestions={phase >= 4} onTestPrediction={testPrediction} />
        ) : (
          <PanelSkeleton lines={8} />
        )
      }
      stage={
        <div className="space-y-4 p-4">
          {banner}
          <StatCards subscribe={subscribe} />
          <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                data-testid="play-pause"
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => setPlaying((value) => !value)}
              >
                {playing ? <Pause /> : <Play />}
              </Button>
              <Button type="button" size="icon" variant="outline" aria-label="Reset simulation" onClick={resetSim}>
                <RotateCcw />
              </Button>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={String(speed)}
                onValueChange={(next) => {
                  if (next === "0.5" || next === "1" || next === "2") setSpeed(Number(next));
                }}
                aria-label="Playback speed"
              >
                <ToggleGroupItem value="0.5">0.5×</ToggleGroupItem>
                <ToggleGroupItem value="1">1×</ToggleGroupItem>
                <ToggleGroupItem value="2">2×</ToggleGroupItem>
              </ToggleGroup>
              <TimeReadout subscribe={subscribe} />
            </div>
            <div className="h-[min(52vh,480px)] min-h-[280px]">
              <SimFrame
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
      }
      controls={
        <ControlDeck lab={lab} controls={controls} onChange={changeControl} onResetDefaults={resetDefaults} />
      }
    />
  );
}

function ShareButton({ lab }: { lab: LabSpec }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        const url = shareUrl(window.location.origin, lab);
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? <Check /> : <Share2 />}
      {copied ? "Copied" : "Share"}
    </Button>
  );
}
