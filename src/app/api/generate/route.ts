import { connection } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { exampleLabs, getBuiltinLab } from "@/lib/labs";
import { createLLMClient, readLLMConfig } from "@/lib/llm/client";
import { createLabId, generateLab } from "@/lib/llm/generate";
import { remixTarget } from "@/lib/remix";
import { labSchema } from "@/lib/spec";

const requestSchema = z.object({
  message: z.string().trim().min(8).max(2000),
  subject: z.string().trim().max(40).optional(),
  grade: z.string().trim().max(40).optional(),
  formats: z.array(z.string().trim().min(2).max(40)).max(8).optional(),
  lab: z.unknown().optional(),
});

export async function POST(request: Request) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Sign in to create or edit a lab." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Describe the lab in at least 8 characters." }, { status: 400 });
  }

  const current = parsed.data.lab == null ? undefined : labSchema.safeParse(parsed.data.lab);
  if (parsed.data.lab != null && !current?.success) {
    return Response.json({ error: "The lab in the chat is not valid anymore." }, { status: 400 });
  }

  if (!current?.success) {
    const remixId = remixTarget(parsed.data.message);
    const remix = remixId ? getBuiltinLab(remixId) : undefined;
    if (remix) {
      const lab = labSchema.parse({ ...remix, id: createLabId() });
      return Response.json({ lab, note: `Started from ${remix.title}. Ask for changes in the next message.` });
    }
  }

  const env = process.env;
  const config = readLLMConfig(env);
  if (!config) {
    return Response.json(
      { error: "Custom generation needs an OPENAI_API_KEY. You can still start from a built-in lab." },
      { status: 503 },
    );
  }

  try {
    const lab = await generateLab({
      prompt: parsed.data.message,
      subject: parsed.data.subject,
      grade: parsed.data.grade,
      formats: parsed.data.formats,
      current: current?.success ? current.data : undefined,
      llm: createLLMClient(config),
      examples: exampleLabs(),
    });
    return Response.json({ lab });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The lab could not be generated.";
    return Response.json({ error: message }, { status: 502 });
  }
}
