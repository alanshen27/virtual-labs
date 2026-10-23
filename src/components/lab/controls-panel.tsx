"use client";

import { Flex, Heading, Select, Slider, Switch, Text, TextField } from "@radix-ui/themes";
import { controlGroups, formatNumber, type ControlMap, type ControlSpec, type ControlValue, type LabSpec } from "@/lib/spec";

export function ControlsPanel({
  lab,
  controls,
  onChange,
}: {
  lab: LabSpec;
  controls: ControlMap;
  onChange: (id: string, value: ControlValue) => void;
}) {
  const groups = controlGroups(lab.controls);
  return (
    <div data-tour="controls" className="rounded-lg bg-[var(--color-panel-solid)] px-6 py-6 lg:sticky lg:top-20">
      <Heading size="4" mb="2">
        Controls
      </Heading>
      <Text as="p" color="gray" style={{ lineHeight: 1.6 }}>
        Move one control at a time and watch the simulation respond.
      </Text>
      {groups.map((group) => (
        <section key={group.name} className="mt-8">
          <Text weight="bold">{group.name}</Text>
          <div className="mt-5 flex flex-col gap-8">
            {group.controls.map((control) => (
              <ControlField
                key={control.id}
                control={control}
                value={controls[control.id] ?? control.default}
                onChange={(value) => onChange(control.id, value)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
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
  const numeric = typeof value === "number" ? value : control.type === "slider" ? control.default : 0;
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <Text>{control.label}</Text>
        {control.type === "slider" ? (
          <Text color="gray">
            {formatNumber(numeric, decimals(control.step))}
            {control.unit ? ` ${control.unit}` : ""}
          </Text>
        ) : null}
      </div>
      {control.type === "slider" ? (
        <Flex align="center" gap="4">
          <Slider
            style={{ flex: 1 }}
            size="3"
            min={control.min}
            max={control.max}
            step={control.step}
            value={[numeric]}
            aria-label={control.label}
            onValueChange={([next]) => {
              if (typeof next === "number") onChange(next);
            }}
          />
          <TextField.Root
            type="number"
            size="2"
            min={control.min}
            max={control.max}
            step={control.step}
            value={numeric}
            aria-label={`${control.label} value`}
            style={{ width: 96 }}
            onChange={(event) => {
              const next = event.target.valueAsNumber;
              if (Number.isFinite(next)) onChange(clamp(next, control.min, control.max));
            }}
          />
        </Flex>
      ) : null}
      {control.type === "toggle" ? (
        <Switch checked={value === true} aria-label={control.label} onCheckedChange={onChange} />
      ) : null}
      {control.type === "select" ? (
        <Select.Root value={typeof value === "string" ? value : control.default} onValueChange={onChange}>
          <Select.Trigger aria-label={control.label} style={{ width: "100%" }} />
          <Select.Content>
            {control.options.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      ) : null}
      {control.hint ? (
        <Text as="p" color="gray" mt="2" size="2">
          {control.hint}
        </Text>
      ) : null}
    </div>
  );
}

function decimals(step: number): number {
  const text = String(step);
  const index = text.indexOf(".");
  return index < 0 ? 0 : Math.min(4, text.length - index - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
