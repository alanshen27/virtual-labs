import { connection } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getBuiltinLab } from "@/lib/labs";
import { createLabId } from "@/lib/llm/generate";
import { labSchema } from "@/lib/spec";

export async function GET() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return Response.json({ labs: [] });
  const labs = await prisma.savedLab.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { labId: true, title: true, summary: true, subject: true, published: true, updatedAt: true },
  });
  return Response.json({ labs });
}

export async function POST(request: Request) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Sign in to save a lab." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as { lab?: unknown; published?: unknown }) : {};
  const parsed = labSchema.safeParse(record.lab);
  if (!parsed.success) return Response.json({ error: "That lab could not be saved." }, { status: 400 });

  const lab = getBuiltinLab(parsed.data.id) ? { ...parsed.data, id: createLabId() } : parsed.data;
  const published = record.published === true;
  const saved = await prisma.savedLab.upsert({
    where: { userId_labId: { userId: session.user.id, labId: lab.id } },
    update: {
      title: lab.title,
      summary: lab.summary,
      subject: lab.subject,
      spec: JSON.stringify(lab),
      published,
    },
    create: {
      userId: session.user.id,
      labId: lab.id,
      title: lab.title,
      summary: lab.summary,
      subject: lab.subject,
      spec: JSON.stringify(lab),
      published,
    },
  });
  return Response.json({ lab, published: saved.published });
}
