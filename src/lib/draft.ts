export type LabDraft = {
  prompt: string;
  subject: string;
  grade: string;
};

const KEY = "virtuallabs.draft.v1";

export function saveDraft(draft: LabDraft): void {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function readDraft(): LabDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as Partial<LabDraft>;
    if (typeof draft.prompt !== "string" || draft.prompt.trim().length < 8) return null;
    return {
      prompt: draft.prompt.trim(),
      subject: typeof draft.subject === "string" ? draft.subject : "Any",
      grade: typeof draft.grade === "string" ? draft.grade : "High school",
    };
  } catch {
    return null;
  }
}
