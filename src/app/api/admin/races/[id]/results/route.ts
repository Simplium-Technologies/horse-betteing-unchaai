import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { calculateRacePoints } from "@/lib/scoring";
import { notifyWS } from "@/lib/notify";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { results } = body;

    if (!results?.length) {
      return NextResponse.json(
        { success: false, error: "Results are required" },
        { status: 400 }
      );
    }

    const race = await prisma.race.findUnique({
      where: { id },
      include: { raceHorses: true },
    });

    if (!race) {
      return NextResponse.json({ success: false, error: "Race not found" }, { status: 404 });
    }

    if (race.status !== "CLOSED") {
      return NextResponse.json(
        { success: false, error: "Can only enter results for CLOSED races" },
        { status: 400 }
      );
    }

    const raceHorseIds = race.raceHorses.map((rh) => rh.horseId);

    for (const r of results) {
      if (!raceHorseIds.includes(r.horseId)) {
        return NextResponse.json(
          { success: false, error: `Horse ${r.horseId} is not in this race` },
          { status: 400 }
        );
      }
    }

    const positions = results.map((r: { actualPosition: number }) => r.actualPosition);
    const uniquePositions = new Set(positions);
    if (
      results.length !== 3 ||
      uniquePositions.size !== 3 ||
      ![1, 2, 3].every((position) => positions.includes(position))
    ) {
      return NextResponse.json(
        { success: false, error: "Results must include exactly 1st, 2nd, and 3rd place" },
        { status: 400 }
      );
    }

    await prisma.raceResult.deleteMany({ where: { raceId: id } });

    await prisma.raceResult.createMany({
      data: results.map((r: { horseId: string; actualPosition: number }) => ({
        raceId: id,
        horseId: r.horseId,
        actualPosition: r.actualPosition,
      })),
    });

    await prisma.race.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    await calculateRacePoints(id);

    notifyWS("race:results_entered", { raceId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Enter results error:", error);
    return NextResponse.json({ success: false, error: "Failed to enter results" }, { status: 500 });
  }
}
