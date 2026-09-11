import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { autoTransitionRaces } from "@/lib/races";
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

  try {
    await autoTransitionRaces();

    const season = await prisma.season.findUnique({ where: { id } });
    if (!season) {
      return NextResponse.json({ success: false, error: "Season not found" }, { status: 404 });
    }

    const races = await prisma.race.findMany({
      where: { seasonId: id },
      include: {
        raceHorses: true,
        _count: { select: { predictions: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, races });
  } catch (error) {
    console.error("Season races error:", error);
    return NextResponse.json({ success: false, error: "Failed to load races" }, { status: 500 });
  }
}
