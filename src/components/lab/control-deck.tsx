"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsDesktop } from "@/components/lab/use-desktop";
import {
  controlGroups,
  formatNumber,
  type ControlMap,
  type ControlSpec,
  type ControlValue,
  type LabSpec,
} from "@/lib/spec";

function digitsFor(step: number): number {
  const text = String(step);
  const index = text.indexOf(".");
  return index < 0 ? 0 : Math.min(4, text.length - index - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function SliderField({
  control,
  value,
  onChange,
}: {
  control: Extract<ControlSpec, { type: "slider" }>;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const digits = digitsFor(control.step);
  const shown = draft ?? formatNumber(value, digits);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={control.id}>{control.label}</Label>
        <span className="font-mono text-sm tabular-nums">
          {formatNumber(value, digits)}
          {control.unit ? ` ${control.unit}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Slider
          id={control.id}
          data-testid={`control-${control.id}`}
          className="flex-1"
          min={control.min}
          max={control.max}
          step={control.step}
          value={[value]}
          onValueChange={(next) => {
            const incoming = Array.isArray(next) ? next[0] : undefined;
            if (typeof incoming === "number") onChange(incoming);
          }}
        />
        <Input
          type="number"
          inputMode="decimal"
          aria-label={`${control.label} value`}
          min={control.min}
          max={control.max}
          step={control.step}
          value={shown}
          className="h-8 w-20"
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            const next = Number(text);
            if (Number.isFinite(next) && next >= control.min && next <= control.max) onChange(next);
          }}
          onBlur={() => {
            const next = Number(draft);
            onChange(Number.isFinite(next) ? clamp(next, control.min, control.max) : value);
            setDraft(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        {control.unit ? <Badge variant="secondary">{control.unit}</Badge> : null}
      </div>
      <FieldMeta control={control} />
    </div>
  );
}

function FieldMeta({ control }: { control: ControlSpec }) {
  if (!control.hint && control.live !== false) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {control.live === false ? <Badge variant="outline">On reset</Badge> : null}
      {control.hint ? <p className="text-xs text-muted-foreground">{control.hint}</p> : null}
    </div>
  );
}

function shortSelect(control: Extract<ControlSpec, { type: "select" }>): boolean {
  return control.options.length <= 4 && control.options.every((option) => option.label.length <= 16);
}

function ControlField({
  control,
  value,
  onChange,
}: {
  control: ControlSpec;
  value: ControlValue;
  onChange: (value: ControlValue) => void;
}) {
  if (control.type === "slider") {
    const numeric = typeof value === "number" ? value : control.default;
    return <SliderField control={control} value={numeric} onChange={onChange} />;
  }

  if (control.type === "toggle") {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <div className="min-w-0">
          <Label htmlFor={control.id}>{control.label}</Label>
          <FieldMeta control={control} />
        </div>
        <Switch
          id={control.id}
          data-testid={`control-${control.id}`}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      </div>
    );
  }

  const selected = typeof value === "string" ? value : control.default;
  if (shortSelect(control)) {
    return (
      <div className="space-y-2">
        <Label>{control.label}</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={selected}
          onValueChange={(next) => {
            if (typeof next === "string" && next) onChange(next);
          }}
          className="w-full"
        >
          {control.options.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} className="flex-1">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldMeta control={control} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{control.label}</Label>
      <Select
        value={selected}
        onValueChange={(next) => {
          if (typeof next === "string" && next) onChange(next);
        }}
      >
        <SelectTrigger className="w-full" data-testid={`control-${control.id}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {control.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldMeta control={control} />
    </div>
  );
}

export function ControlDeck({
  lab,
  controls,
  onChange,
  onResetDefaults,
}: {
  lab: LabSpec;
  controls: ControlMap;
  onChange: (id: string, value: ControlValue) => void;
  onResetDefaults: () => void;
}) {
  const desktop = useIsDesktop();
  const groups = controlGroups(lab.controls);
  const body = (
    <div className="flex flex-col gap-4 p-4">
      <Accordion type="multiple" defaultValue={groups.map((group) => group.name)} className="gap-1">
        {groups.map((group) => (
          <AccordionItem key={group.name} value={group.name}>
            <AccordionTrigger className="py-2 text-sm">{group.name}</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-3">
              {group.controls.map((control) => (
                <ControlField
                  key={control.id}
                  control={control}
                  value={controls[control.id] ?? control.default}
                  onChange={(value) => onChange(control.id, value)}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Button type="button" variant="outline" className="w-full" onClick={onResetDefaults}>
        <RotateCcw />
        Reset to defaults
      </Button>
    </div>
  );

  if (desktop) {
    return <ScrollArea className="h-full">{body}</ScrollArea>;
  }
  return body;
}
