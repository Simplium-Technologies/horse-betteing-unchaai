import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const races = await prisma.race.findMany({
    where: { status: { in: ["UPCOMING", "OPEN", "CLOSED", "COMPLETED"] } },
    include: {
      season: true,
      raceHorses: { include: { horse: true } },
      _count: { select: { predictions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const userPredictions = await prisma.prediction.findMany({
    where: { userId: user.id },
    select: { raceId: true },
  });

  const predictedRaceIds = new Set(userPredictions.map((p) => p.raceId));

  const racesWithPrediction = races.map((race) => ({
    id: race.id,
    name: race.name,
    durationMinutes: race.durationMinutes,
    autoClose: race.autoClose,
    startedAt: race.startedAt,
    openedAt: race.openedAt,
    status: race.status,
    seasonId: race.seasonId,
    seasonName: race.season?.name || null,
    horseCount: race.raceHorses.length,
    predictionCount: race._count.predictions,
    hasPredicted: predictedRaceIds.has(race.id),
  }));

  return NextResponse.json({ success: true, races: racesWithPrediction });
}
