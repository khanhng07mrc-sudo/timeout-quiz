"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PlayerPad from "@/components/olympia/PlayerPad";

function Inner() {
  const { code } = useParams<{ code: string }>();
  const search = useSearchParams();
  const seatStr = search?.get("seat");
  const name = search?.get("name") ?? undefined;
  const isSandbox = search?.get("sandbox") === "1" || search?.get("variant") === "sandbox";
  const initialSeat = seatStr !== null && seatStr !== undefined ? Number(seatStr) : undefined;
  return <PlayerPad code={code} initialSeat={initialSeat} initialName={name} isSandbox={isSandbox} />;
}

export default function Page() {
  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-black select-none">
      <Suspense fallback={null}>
        <Inner />
      </Suspense>
    </main>
  );
}
