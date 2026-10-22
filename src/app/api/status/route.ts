import { connection } from "next/server";
import { readLLMConfig } from "@/lib/llm/client";

export async function GET() {
  await connection();
  const env = process.env;
  return Response.json({ generationEnabled: readLLMConfig(env) !== null });
}
