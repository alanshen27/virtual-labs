import { Suspense } from "react";
import { ShareOpener } from "@/components/share-opener";

export default function SharePage() {
  return (
    <Suspense>
      <ShareOpener />
    </Suspense>
  );
}
