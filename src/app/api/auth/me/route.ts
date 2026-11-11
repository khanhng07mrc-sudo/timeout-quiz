import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  verifyAdminToken,
  getCookieValue,
  DEMO_HOST_IDS,
  DEMO_HOST_EMAILS,
} from "@/lib/security";
import { prisma } from "@/lib/prisma";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
};

async function findPrimaryRealAdmin() {
  try {
    const primaryAdmin = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        id: { notIn: DEMO_HOST_IDS },
        email: { notIn: DEMO_HOST_EMAILS },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });
    if (primaryAdmin) return primaryAdmin;
  } catch {}

  return {
    id: "master-admin",
    name: "Nguyễn Gia Khánh",
    email: "channelngktv@gmail.com",
    role: "ADMIN" as const,
    image: null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const userSession = getCurrentUserFromRequest(req);

    if (userSession) {
      // Master-admin placeholder tokens only resolve to primary real admin if they don't carry a specific user email
      if (userSession.userId === "master-admin") {
        const sessionEmail = userSession.email?.trim().toLowerCase();
        const isGenericPlaceholder =
          !sessionEmail ||
          sessionEmail === "admin@quizorra.com" ||
          DEMO_HOST_EMAILS.includes(sessionEmail);

        if (!isGenericPlaceholder) {
          let matchedByEmail = null;
          try {
            matchedByEmail = await prisma.user.findUnique({
              where: { email: sessionEmail },
              select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
            });
          } catch {}

          return NextResponse.json(
            {
              authenticated: true,
              user: matchedByEmail || {
                id: "master-admin",
                name: userSession.name,
                email: sessionEmail,
                role: "ADMIN",
              },
            },
            { headers: NO_CACHE_HEADERS }
          );
        }

        const primaryAdmin = await findPrimaryRealAdmin();
        return NextResponse.json(
          {
            authenticated: true,
            user: primaryAdmin,
          },
          { headers: NO_CACHE_HEADERS }
        );
      }

      // Fetch fresh user data from DB by id or email, ensuring email strictly matches the signed session
      let dbUser = null;
      const sessionEmail = userSession.email?.trim().toLowerCase();
      try {
        if (userSession.userId && !userSession.userId.startsWith("master:")) {
          dbUser = await prisma.user.findUnique({
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
        }
        if ((!dbUser || (sessionEmail && dbUser.email.toLowerCase() !== sessionEmail)) && sessionEmail) {
          dbUser = await prisma.user.findUnique({
            where: { email: sessionEmail },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
              createdAt: true,
            },
          });
        }
      } catch {}

      if (dbUser && (!sessionEmail || dbUser.email.toLowerCase() === sessionEmail)) {
        return NextResponse.json(
          {
            authenticated: true,
            user: dbUser,
          },
          { headers: NO_CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        {
          authenticated: true,
          user: {
            id: userSession.userId,
            name: userSession.name,
            email: userSession.email,
            role: userSession.role,
          },
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Check legacy admin token (e.g., anonymous tokens created before email-bound admin tokens)
    const legacyAdminCookie = getCookieValue(req, "admin_token") || getCookieValue(req, "auth_token");
    const authHeader = req.headers.get("authorization");
    const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const candidateToken = legacyAdminCookie || headerToken;

    if (candidateToken && verifyAdminToken(candidateToken)) {
      const primaryAdmin = await findPrimaryRealAdmin();
      return NextResponse.json(
        {
          authenticated: true,
          user: primaryAdmin,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        authenticated: false,
        user: null,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("[GET /api/auth/me]", err);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
