import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function LabFrame({
  title,
  actions,
  learner,
  stage,
  controls,
}: {
  title: string;
  actions?: ReactNode;
  learner: ReactNode;
  stage: ReactNode;
  controls: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background lg:h-svh lg:overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/" aria-label="Home">
            <ChevronLeft />
          </Link>
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
        {actions}
      </header>
      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[360px_minmax(0,1fr)_320px] lg:overflow-hidden">
        <aside className="order-3 border-t lg:order-none lg:col-start-1 lg:h-full lg:min-h-0 lg:overflow-hidden lg:border-t-0 lg:border-r">
          {learner}
        </aside>
        <div className="order-1 min-w-0 lg:col-start-2 lg:h-full lg:min-h-0 lg:overflow-y-auto">{stage}</div>
        <aside className="order-2 border-t lg:order-none lg:col-start-3 lg:h-full lg:min-h-0 lg:overflow-hidden lg:border-t-0 lg:border-l">
          {controls}
        </aside>
      </div>
    </div>
  );
}

export function PanelSkeleton({ lines = 7 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className="h-4" style={{ width: `${92 - (index % 4) * 12}%` }} />
      ))}
      <Skeleton className="mt-4 h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function CanvasSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-[320px] w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
