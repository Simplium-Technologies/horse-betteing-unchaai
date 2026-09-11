import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  const { id } = await params;

  const race = await prisma.race.findUnique({
    where: { id },
    include: {
      raceHorses: { include: { horse: true } },
      predictions: { include: { selections: true } },
      results: { include: { horse: true } },
    },
  });

  if (!race) {
    return NextResponse.json({ success: false, error: "Race not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, race });
}
