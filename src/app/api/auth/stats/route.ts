import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id, race: { includePoints: true } },
    select: { totalPoints: true, raceId: true },
  });

  const totalPoints = predictions.reduce((sum, p) => sum + p.totalPoints, 0);
  const racesPlayed = predictions.length;

  const raceBreakdown = await prisma.prediction.findMany({
    where: { userId: user.id, race: { includePoints: true } },
    select: {
      totalPoints: true,
      submittedAt: true,
      race: {
        select: {
          id: true,
          name: true,
          status: true,
          startedAt: true,
          season: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const allUsers = await prisma.user.findMany({
    select: {
      predictions: {
        where: { race: { includePoints: true } },
        select: { totalPoints: true },
      },
    },
  });

  const userPoints = allUsers
    .map((u) => u.predictions.reduce((sum, p) => sum + p.totalPoints, 0))
    .sort((a, b) => b - a);

  const rank = userPoints.findIndex((p) => p <= totalPoints) + 1 || userPoints.length;

  return NextResponse.json({
    success: true,
    stats: {
      totalPoints,
      racesPlayed,
      rank,
      breakdown: raceBreakdown.map((p) => ({
        raceId: p.race.id,
        raceName: p.race.name,
        seasonName: p.race.season?.name || null,
        status: p.race.status,
        points: p.totalPoints,
        submittedAt: p.submittedAt.toISOString(),
        raceStartedAt: p.race.startedAt?.toISOString() || null,
      })),
    },
  });
}
