import { Suspense } from "react";
import { ExplorePage } from "@/components/landing/explore-page";

export default function Page() {
  return (
    <Suspense>
      <ExplorePage />
    </Suspense>
  );
}
