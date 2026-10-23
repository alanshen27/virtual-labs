"use client";

import { InputNumber, Select, Slider, Switch, Typography } from "antd";
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
    <div data-tour="controls" className="rounded-lg bg-white px-6 py-6 lg:sticky lg:top-20">
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Controls
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Move one control at a time and watch the simulation respond.
      </Typography.Paragraph>
      {groups.map((group) => (
        <section key={group.name} className="mt-8">
          <Typography.Text strong>{group.name}</Typography.Text>
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
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <Typography.Text>{control.label}</Typography.Text>
        {control.type === "slider" ? (
          <Typography.Text type="secondary">
            {formatNumber(typeof value === "number" ? value : control.default, decimals(control.step))}
            {control.unit ? ` ${control.unit}` : ""}
          </Typography.Text>
        ) : null}
      </div>
      {control.type === "slider" ? (
        <div className="flex items-center gap-4">
          <Slider
            className="flex-1"
            min={control.min}
            max={control.max}
            step={control.step}
            value={typeof value === "number" ? value : control.default}
            onChange={(next) => onChange(next)}
            tooltip={{ formatter: (next) => `${next}${control.unit ? ` ${control.unit}` : ""}` }}
          />
          <InputNumber
            min={control.min}
            max={control.max}
            step={control.step}
            value={typeof value === "number" ? value : control.default}
            onChange={(next) => {
              if (typeof next === "number") onChange(next);
            }}
            style={{ width: 96 }}
          />
        </div>
      ) : null}
      {control.type === "toggle" ? (
        <Switch checked={value === true} onChange={onChange} />
      ) : null}
      {control.type === "select" ? (
        <Select
          className="w-full"
          value={typeof value === "string" ? value : control.default}
          options={control.options.map((option) => ({ value: option.value, label: option.label }))}
          onChange={(next) => onChange(next)}
        />
      ) : null}
      {control.hint ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          {control.hint}
        </Typography.Paragraph>
      ) : null}
    </div>
  );
}

function decimals(step: number): number {
  const text = String(step);
  const index = text.indexOf(".");
  return index < 0 ? 0 : Math.min(4, text.length - index - 1);
}
