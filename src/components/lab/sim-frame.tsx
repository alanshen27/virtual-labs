"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { sanitizeSample, type LabSample } from "@/lib/sandbox/sample";
import { buildSrcdoc } from "@/lib/sandbox/srcdoc";
import type { ControlMap, LabSpec } from "@/lib/spec";

type Props = {
  lab: LabSpec;
  controls: ControlMap;
  playing: boolean;
  speed: number;
  resetNonce: number;
  onSample: (sample: LabSample) => void;
};

export function SimFrame({ lab, controls, playing, speed, resetNonce, onSample }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsRef = useRef(controls);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const onSampleRef = useRef(onSample);
  const readyRef = useRef(false);
  const [reloadEpoch, setReloadEpoch] = useState(0);
  const [failure, setFailure] = useState<{ signature: string; message: string } | null>(null);
  const signature = `${lab.id}:${reloadEpoch}`;
  const [src, setSrc] = useState(() => ({
    signature,
    html: buildSrcdoc(lab.code, controls),
  }));

  if (src.signature !== signature) {
    setSrc({ signature, html: buildSrcdoc(lab.code, controls) });
  }

  const error = failure && failure.signature === src.signature ? failure.message : null;

  useEffect(() => {
    controlsRef.current = controls;
    playingRef.current = playing;
    speedRef.current = speed;
    onSampleRef.current = onSample;
  }, [controls, playing, speed, onSample]);

  const post = (message: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(message, "*");
  };

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    readyRef.current = false;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: unknown; message?: unknown };
      if (!data || typeof data !== "object") return;
      if (data.type === "ready") {
        readyRef.current = true;
        iframeRef.current?.contentWindow?.postMessage(
          { type: "controls", values: controlsRef.current },
          "*",
        );
        iframeRef.current?.contentWindow?.postMessage(
          { type: "playback", playing: playingRef.current, speed: speedRef.current },
          "*",
        );
        return;
      }
      if (data.type === "sample") {
        const sample = sanitizeSample(data);
        if (sample) onSampleRef.current(sample);
        return;
      }
      if (data.type === "error") {
        setFailure({
          signature,
          message: typeof data.message === "string" ? data.message : "The simulation hit an error.",
        });
      }
    };
    window.addEventListener("message", onMessage);
    iframe.srcdoc = src.html;
    return () => window.removeEventListener("message", onMessage);
  }, [src.html, signature]);

  useEffect(() => {
    post({ type: "controls", values: controls });
  }, [controls]);

  useEffect(() => {
    post({ type: "playback", playing, speed });
  }, [playing, speed]);

  const skipReset = useRef(true);
  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false;
      return;
    }
    post({
      type: "reset",
      values: controlsRef.current,
      playing: playingRef.current,
      speed: speedRef.current,
    });
  }, [resetNonce]);

  return (
    <div data-testid="sim-frame" className="relative h-full min-h-[280px] w-full overflow-hidden bg-neutral-950">
      <iframe
        ref={iframeRef}
        title={`${lab.title} simulation`}
        className="absolute inset-0 h-full w-full border-0"
        sandbox="allow-scripts"
      />
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/90 p-6 text-center text-sm text-white">
          <p>{error}</p>
          <Button type="button" variant="secondary" onClick={() => setReloadEpoch((value) => value + 1)}>
            Reload
          </Button>
        </div>
      ) : null}
    </div>
  );
}
