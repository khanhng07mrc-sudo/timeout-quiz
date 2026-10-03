import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyAdminToken } from "@/lib/security";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userSession = getCurrentUserFromRequest(req);

    if (userSession) {
      if (userSession.userId === "master-admin") {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: "master-admin",
            name: "Super Admin",
            email: "admin@quizorra.com",
            role: "ADMIN",
          },
        });
      }

      // Fetch fresh user data from DB
      const dbUser = await prisma.user.findUnique({
        where: { id: userSession.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
        },
      });

      if (dbUser) {
        return NextResponse.json({
          authenticated: true,
          user: dbUser,
        });
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: userSession.userId,
          name: userSession.name,
          email: userSession.email,
          role: userSession.role,
        },
      });
    }

    // Check legacy admin token
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const matchAdmin = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
      if (matchAdmin && matchAdmin[1] && verifyAdminToken(decodeURIComponent(matchAdmin[1]))) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: "master-admin",
            name: "Super Admin",
            email: "admin@quizorra.com",
            role: "ADMIN",
          },
        });
      }
    }

    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  } catch (err) {
    console.error("[GET /api/auth/me]", err);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}
