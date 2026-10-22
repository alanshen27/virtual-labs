import { connection } from "next/server";
import { z } from "zod";
import { exampleLabs } from "@/lib/labs";
import { createLLMClient, readLLMConfig } from "@/lib/llm/client";
import { generateLab } from "@/lib/llm/generate";

const requestSchema = z.object({
  prompt: z.string().trim().min(8).max(500),
  subject: z.string().trim().max(40).optional(),
  grade: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  await connection();
  const env = process.env;
  const config = readLLMConfig(env);
  if (!config) {
    return Response.json(
      {
        error: "Custom generation needs an OPENAI_API_KEY. Built-in labs still work without one.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body with a prompt." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Prompt must be between 8 and 500 characters." }, { status: 400 });
  }

  try {
    const lab = await generateLab({
      prompt: parsed.data.prompt,
      subject: parsed.data.subject,
      grade: parsed.data.grade,
      llm: createLLMClient(config),
      examples: exampleLabs(),
    });
    return Response.json({ lab });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The lab could not be generated.";
    return Response.json({ error: message }, { status: 502 });
  }
}
