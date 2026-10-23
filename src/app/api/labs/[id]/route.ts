import { connection } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { labSchema } from "@/lib/spec";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  await connection();
  const { id } = await context.params;
  const session = await auth();
  const saved = await prisma.savedLab.findFirst({
    where: session?.user?.id
      ? { labId: id, OR: [{ published: true }, { userId: session.user.id }] }
      : { labId: id, published: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!saved) return Response.json({ error: "This lab is not available." }, { status: 404 });
  const parsed = labSchema.safeParse(JSON.parse(saved.spec));
  if (!parsed.success) return Response.json({ error: "This saved lab is damaged." }, { status: 500 });
  return Response.json({
    lab: parsed.data,
    published: saved.published,
    owned: session?.user?.id === saved.userId,
  });
}

export async function PATCH(request: Request, context: Context) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in to update a lab." }, { status: 401 });
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const published =
    body && typeof body === "object" && "published" in body ? (body as { published?: unknown }).published === true : null;
  if (published == null) return Response.json({ error: "Say whether students can open this lab." }, { status: 400 });
  const saved = await prisma.savedLab.findUnique({
    where: { userId_labId: { userId: session.user.id, labId: id } },
  });
  if (!saved) return Response.json({ error: "Save the lab before sharing it." }, { status: 404 });
  const updated = await prisma.savedLab.update({
    where: { id: saved.id },
    data: { published },
  });
  return Response.json({ published: updated.published });
}
