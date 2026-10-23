import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateStudio } from "@/components/create/create-studio";

export default async function CreatePage() {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/create");
  return (
    <Suspense>
      <CreateStudio />
    </Suspense>
  );
}
