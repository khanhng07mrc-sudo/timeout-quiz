import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getBuildMeta() {
  try {
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    const buildId = fs.existsSync(buildIdPath) ? fs.readFileSync(buildIdPath, "utf-8").trim() : "unknown";
    return { buildId };
  } catch {
    return { buildId: "unknown" };
  }
}

export async function GET() {
  const { buildId } = getBuildMeta();
  const commit = process.env.GIT_COMMIT || process.env.NEXT_PUBLIC_GIT_COMMIT || "HEAD";

  return NextResponse.json(
    {
      status: "ok",
      commit,
      buildId,
      version: "0.1.0",
      uptime: process.uptime(),
      timestamp: Date.now(),
    },
    { status: 200 }
  );
}
