import { Suspense } from "react";
import { HomePage } from "@/components/landing/home-page";

export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
