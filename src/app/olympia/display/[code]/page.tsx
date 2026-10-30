"use client";

import { useParams } from "next/navigation";
import DisplayScreen from "@/components/olympia/DisplayScreen";

export default function Page() {
  const { code } = useParams<{ code: string }>();
  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-black select-none">
      <DisplayScreen code={code} />
    </main>
  );
}
