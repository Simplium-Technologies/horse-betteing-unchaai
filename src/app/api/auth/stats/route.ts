import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

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

  const totalPoints = raceBreakdown.reduce((sum, p) => sum + p.totalPoints, 0);
  const racesPlayed = raceBreakdown.length;

  const userTotals = await prisma.prediction.groupBy({
    by: ["userId"],
    where: { race: { includePoints: true } },
    _sum: { totalPoints: true },
  });

  const higherRankedCount = userTotals.filter(
    (u) => (u._sum.totalPoints ?? 0) > totalPoints
  ).length;
  const rank = higherRankedCount + 1;

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
