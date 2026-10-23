import { describe, expect, it } from "vitest";
import { pendulumLab } from "@/lib/labs/pendulum";
import { LAB_CONTRACT, buildMessages, extractJson, generateLab } from "@/lib/llm/generate";
import { renderExport } from "@/lib/export-file";
import type { LLMClient } from "@/lib/llm/client";
import { pendulumPeriod, smallAnglePeriod } from "@/lib/physics";
import { decodeShareHash, encodeShareHash } from "@/lib/share";

function scripted(responses: string[]): LLMClient & { count: () => number } {
  let calls = 0;
  return {
    count: () => calls,
    async complete() {
      const next = responses[calls];
      calls += 1;
      if (next == null) throw new Error("The mock ran out of responses.");
      return next;
    },
  };
}

const valid = JSON.stringify({ ...pendulumLab, id: "from-model" });

describe("generateLab", () => {
  it("accepts a JSON lab and overwrites the id", async () => {
    const llm = scripted([valid]);
    const lab = await generateLab({
      prompt: "Show me a pendulum",
      llm,
      examples: [],
      idFactory: () => "c-abc12345",
    });
    expect(llm.count()).toBe(1);
    expect(lab.id).toBe("c-abc12345");
    expect(lab.title).toBe(pendulumLab.title);
  });

  it("reads a lab wrapped in a markdown fence", async () => {
    const llm = scripted(["Here you go:\n```json\n" + valid + "\n```"]);
    const lab = await generateLab({
      prompt: "Show me a pendulum",
      llm,
      examples: [],
      idFactory: () => "c-fence001",
    });
    expect(lab.id).toBe("c-fence001");
    expect(extractJson("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("repairs once when the first response is invalid", async () => {
    const llm = scripted(['{"title":"nope"}', valid]);
    const lab = await generateLab({
      prompt: "Show me a pendulum",
      llm,
      examples: [],
      idFactory: () => "c-repair01",
    });
    expect(llm.count()).toBe(2);
    expect(lab.id).toBe("c-repair01");
  });

  it("throws when the repair is still invalid", async () => {
    const llm = scripted(["not json", '{"title":"still no"}']);
    await expect(
      generateLab({
        prompt: "Show me a pendulum",
        llm,
        examples: [],
        idFactory: () => "c-fail0001",
      }),
    ).rejects.toThrow();
    expect(llm.count()).toBe(2);
  });
});

describe("share links", () => {
  it("round-trips a lab through a base64url hash", () => {
    const decoded = decodeShareHash(encodeShareHash(pendulumLab));
    expect(decoded.id).toBe(pendulumLab.id);
    expect(decoded.title).toBe(pendulumLab.title);
    expect(decoded.code).toBe(pendulumLab.code);
    expect(decoded.activity.items).toHaveLength(pendulumLab.activity.items.length);
    expect(decoded.exports.map((item) => item.id)).toEqual(pendulumLab.exports.map((item) => item.id));
  });
});

describe("authoring contract", () => {
  it("asks for exports and an activity sheet, and leaves quizzes out", () => {
    expect(LAB_CONTRACT).toContain("exports");
    expect(LAB_CONTRACT).toContain("activity");
    expect(LAB_CONTRACT).not.toContain("multiple_choice");
    const messages = buildMessages("Add a CSV of period versus length", [], { formats: ["csv", "png"] });
    expect(messages[1]?.content).toContain("csv, png");
  });
});

describe("export files", () => {
  it("writes chart points as CSV and refuses a canvas export without an image", () => {
    const csv = pendulumLab.exports.find((item) => item.format === "csv");
    const png = pendulumLab.exports.find((item) => item.format === "png");
    expect(csv).toBeTruthy();
    expect(png).toBeTruthy();
    const file = renderExport(csv!, pendulumLab.chart, {
      readouts: [],
      points: [
        { x: 0.5, y: 1.4 },
        { x: 1, y: 2 },
      ],
      series: null,
      controls: {},
      time: 1,
    });
    expect(file.body).toContain("Length,Period");
    expect(file.body).toContain("0.5,1.4");
    expect(() =>
      renderExport(png!, pendulumLab.chart, {
        readouts: [],
        points: [],
        series: null,
        controls: {},
        time: 0,
      }),
    ).toThrow(/canvas image/i);
  });
});

describe("physics references", () => {
  it("matches the small-angle pendulum period", () => {
    expect(pendulumPeriod(1, 9.8, 0.001)).toBeCloseTo(smallAnglePeriod(1, 9.8), 4);
  });
});
