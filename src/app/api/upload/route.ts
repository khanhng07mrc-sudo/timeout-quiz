import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/security";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn tệp tải lên" }, { status: 400 });
    }

    // Max 100MB
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Kích thước tệp vượt quá 100MB" }, { status: 400 });
    }

    const mime = file.type;
    let mediaType: "image" | "video" | "audio" = "image";
    if (mime.startsWith("video/")) {
      mediaType = "video";
    } else if (mime.startsWith("audio/")) {
      mediaType = "audio";
    } else if (mime.startsWith("image/")) {
      mediaType = "image";
    } else {
      return NextResponse.json(
        { error: "Định dạng tệp không được hỗ trợ. Vui lòng tải lên ảnh, video hoặc audio" },
        { status: 400 }
      );
    }

    const originalName = file.name || "media";
    const ext = path.extname(originalName) || (mediaType === "video" ? ".mp4" : mediaType === "audio" ? ".mp3" : ".png");
    const safeName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext.toLowerCase()}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "media");
    await fs.mkdir(uploadsDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadsDir, safeName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/media/${safeName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      mediaType,
      fileName: safeName,
      originalName,
      size: file.size,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Lỗi tải tệp lên máy chủ: " + (err.message || String(err)) }, { status: 500 });
  }
}
