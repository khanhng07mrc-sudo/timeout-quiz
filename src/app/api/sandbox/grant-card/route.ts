import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CardType } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { roomId, teamId, cardType } = (await req.json()) as {
      roomId: string;
      teamId: string;
      cardType: CardType;
    };

    if (!roomId || !teamId || !cardType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const card = await prisma.powerupCard.create({
      data: {
        roomId,
        teamId,
        type: cardType,
        ownerType: "TEAM",
        used: false,
      },
    });

    return NextResponse.json({ success: true, card });
  } catch (error) {
    console.error("[sandbox:grant-card] Error:", error);
    return NextResponse.json({ error: "Lỗi cấp thẻ hỗ trợ" }, { status: 500 });
  }
}
