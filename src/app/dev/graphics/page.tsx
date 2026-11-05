import { notFound } from "next/navigation";
import { DevGraphicsClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Olympia V3 Broadcast Graphics Dev Preview",
};

export default function DevGraphicsPage() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_GRAPHICS !== "true") {
    notFound();
  }

  return <DevGraphicsClient />;
}
