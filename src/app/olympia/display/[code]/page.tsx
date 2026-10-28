"use client";

import { useParams } from "next/navigation";
import DisplayScreen from "@/components/olympia/DisplayScreen";

export default function Page() {
  const { code } = useParams<{ code: string }>();
  return <DisplayScreen code={code} />;
}
