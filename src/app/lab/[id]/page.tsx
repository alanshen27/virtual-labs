import { Suspense } from "react";
import { LabExperience } from "@/components/lab/lab-experience";
import { CanvasSkeleton, LabFrame, PanelSkeleton } from "@/components/lab/lab-shell";
import { getBuiltinLab } from "@/lib/labs";

export default function LabPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <LabFrame
          title="Loading lab"
          learner={<PanelSkeleton />}
          stage={<CanvasSkeleton />}
          controls={<PanelSkeleton />}
        />
      }
    >
      <LabRoute params={params} />
    </Suspense>
  );
}

async function LabRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const builtin = getBuiltinLab(id) ?? null;
  return <LabExperience id={id} builtin={builtin} />;
}
