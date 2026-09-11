import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

const DEFAULT_POINT_RULES = [
  { name: "Correct 1st Place", type: "CORRECT_POSITION" as const, position: 1, points: 10 },
  { name: "Correct 2nd Place", type: "CORRECT_POSITION" as const, position: 2, points: 7 },
  { name: "Correct 3rd Place", type: "CORRECT_POSITION" as const, position: 3, points: 5 },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const session = await getSession();

    if (session && session.role === "ADMIN") {
      const user = await prisma.user.findUnique({ where: { phoneNumber } });
      if (user) {
        await prisma.user.update({ where: { phoneNumber }, data: { role: "ADMIN" } });
      }
    }

    const user = await prisma.user.upsert({
      where: { phoneNumber },
      update: { role: "ADMIN" },
      create: { phoneNumber, role: "ADMIN" },
    });

    const existing = await prisma.pointRule.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map((r) => r.name));
    const missing = DEFAULT_POINT_RULES.filter((r) => !existingNames.has(r.name));
    if (missing.length > 0) {
      await prisma.pointRule.createMany({ data: missing });
    }

    return NextResponse.json({
      success: true,
      message: `User ${phoneNumber} is now an admin. Default point rules created if none existed.`,
      user: { id: user.id, phoneNumber: user.phoneNumber, role: user.role },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: "Failed to seed" }, { status: 500 });
  }
}
