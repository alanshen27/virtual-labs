import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateStudio } from "@/components/create/create-studio";

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <CreateGate />
    </Suspense>
  );
}

async function CreateGate() {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/create");
  return <CreateStudio />;
}
