import { Suspense } from "react";
import { StudentLab } from "@/components/lab/student-lab";
import { getBuiltinLab } from "@/lib/labs";

export default function LabPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <LabRoute params={params} />
    </Suspense>
  );
}

async function LabRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentLab id={id} builtin={getBuiltinLab(id) ?? null} />;
}
