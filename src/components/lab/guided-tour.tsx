"use client";

import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";

export type TourStep = { id: string; target: string; title: string; body: string };

type Box = { top: number; left: number; width: number; height: number };

export function GuidedTour({
  open,
  steps,
  onClose,
}: {
  open: boolean;
  steps: TourStep[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = steps[index] ?? steps[0];

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setIndex(0), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !step) return;
    const target = step.target;
    function measure(scroll: boolean) {
      const element = document.querySelector(`[data-tour="${target}"]`);
      if (!(element instanceof HTMLElement)) {
        setBox((current) => (current === null ? current : null));
        return;
      }
      if (scroll) element.scrollIntoView({ block: "center", inline: "nearest" });
      const rect = element.getBoundingClientRect();
      const next = {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.max(Math.round(rect.width), 8),
        height: Math.max(Math.round(rect.height), 8),
      };
      setBox((current) =>
        current &&
        current.top === next.top &&
        current.left === next.left &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next,
      );
    }
    const timer = window.setTimeout(() => measure(true), 0);
    const onMove = () => measure(false);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, step]);

  if (!open || !step) return null;

  const last = index >= steps.length - 1;
  const card = placeCard(box);

  return (
    <>
      {box ? (
        <div
          data-tour-ring
          aria-hidden
          style={{
            position: "fixed",
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            borderRadius: 12,
            boxShadow: "0 0 0 2px var(--accent-9)",
            pointerEvents: "none",
            zIndex: 40,
          }}
        />
      ) : null}
      <Card
        role="dialog"
        aria-label={step.title}
        size="3"
        style={{ position: "fixed", top: card.top, left: card.left, width: 340, zIndex: 50 }}
      >
        <Heading size="3">{step.title}</Heading>
        <Text as="p" color="gray" mt="2" size="2" style={{ lineHeight: 1.6 }}>
          {step.body}
        </Text>
        <Flex align="center" justify="between" mt="4" gap="3">
          <Text color="gray" size="1">
            {index + 1} / {steps.length}
          </Text>
          <Flex gap="2">
            <Button variant="ghost" color="gray" onClick={onClose}>
              Skip
            </Button>
            {index > 0 ? (
              <Button variant="soft" color="gray" onClick={() => setIndex((current) => current - 1)}>
                Back
              </Button>
            ) : null}
            <Button
              onClick={() => {
                if (last) onClose();
                else setIndex((current) => current + 1);
              }}
            >
              {last ? "Done" : "Next"}
            </Button>
          </Flex>
        </Flex>
      </Card>
    </>
  );
}

function placeCard(box: Box | null): { top: number; left: number } {
  const cardW = 340;
  const cardH = 210;
  const gap = 16;
  if (!box || typeof window === "undefined") return { top: 88, left: 24 };
  const candidates = [
    { top: box.top - cardH - gap, left: box.left },
    { top: box.top + box.height + gap, left: box.left },
    { top: box.top, left: box.left - cardW - gap },
    { top: box.top, left: box.left + box.width + gap },
  ];
  const fits = candidates.find(
    (candidate) =>
      candidate.top >= 72 &&
      candidate.left >= 16 &&
      candidate.top + cardH <= window.innerHeight - 16 &&
      candidate.left + cardW <= window.innerWidth - 16,
  );
  return fits ?? { top: 88, left: Math.max(16, window.innerWidth - cardW - 16) };
}
