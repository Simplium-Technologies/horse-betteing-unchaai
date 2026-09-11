import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { UserRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = body.name?.trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    const data: { name: string; role?: UserRole } = { name };
    if (user.name === null) {
      data.role = "PARTICIPANT" as UserRole;
    }

    await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete profile error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
