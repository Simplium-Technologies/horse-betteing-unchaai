import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const race = await prisma.race.findUnique({
      where: { id },
      include: { raceHorses: true },
    });

    if (!race) {
      return NextResponse.json({ success: false, error: "Race not found" }, { status: 404 });
    }

    if (race.status !== "OPEN" && race.status !== "CLOSED") {
      return NextResponse.json(
        { success: false, error: "Predictions are only allowed for OPEN or recently CLOSED races" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { selections, submittedAt } = body;

    if (!selections?.length) {
      return NextResponse.json(
        { success: false, error: "Selections are required" },
        { status: 400 }
      );
    }

    const raceHorseIds = new Set(race.raceHorses.map((rh) => rh.horseId));

    for (const s of selections) {
      if (!raceHorseIds.has(s.horseId)) {
        return NextResponse.json(
          { success: false, error: `Horse ${s.horseId} is not in this race` },
          { status: 400 }
        );
      }
    }

    const positions = selections.map((s: { predictedPosition: number }) => s.predictedPosition);
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
      return NextResponse.json(
        { success: false, error: "Duplicate positions are not allowed" },
        { status: 400 }
      );
    }

    for (const pos of positions) {
      if (pos < 1 || pos > 3) {
        return NextResponse.json(
          { success: false, error: "Positions must be between 1 and 3" },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.prediction.findUnique({
      where: { userId_raceId: { userId: user.id, raceId: id } },
    });

    if (existing) {
      await prisma.predictionSelection.deleteMany({
        where: { predictionId: existing.id },
      });

      await prisma.predictionSelection.createMany({
        data: selections.map((s: { horseId: string; predictedPosition: number }) => ({
          predictionId: existing.id,
          horseId: s.horseId,
          predictedPosition: s.predictedPosition,
        })),
      });

      return NextResponse.json({ success: true, predictionId: existing.id });
    }

    const prediction = await prisma.prediction.create({
      data: {
        userId: user.id,
        raceId: id,
        submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
        selections: {
          create: selections.map((s: { horseId: string; predictedPosition: number }) => ({
            horseId: s.horseId,
            predictedPosition: s.predictedPosition,
          })),
        },
      },
    });

    fetch("http://localhost:3001/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "race:prediction_new", data: { raceId: id } }),
    }).catch(() => {});

    return NextResponse.json({ success: true, predictionId: prediction.id });
  } catch (error) {
    console.error("Submit prediction error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit prediction" }, { status: 500 });
  }
}
