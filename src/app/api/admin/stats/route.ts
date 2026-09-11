import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  const participants = await prisma.user.count({
    where: { role: "PARTICIPANT" },
  });

  return NextResponse.json({ success: true, participants });
}
