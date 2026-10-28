"use client";

import { useParams } from "next/navigation";
import PlayerPad from "@/components/olympia/PlayerPad";

export default function Page() {
  const { code } = useParams<{ code: string }>();
  return <PlayerPad code={code} />;
}
