import { connection } from "next/server";
import { readLLMConfig } from "@/lib/llm/client";

export async function GET() {
  await connection();
  const env = process.env;
  return Response.json({
    generationEnabled: readLLMConfig(env) !== null,
    githubEnabled: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
    devEmail: env.AUTH_DEV_EMAIL || "teacher@localhost",
  });
}
