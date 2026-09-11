import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { autoTransitionRaces } from "@/lib/races";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  await autoTransitionRaces();

  const race = await prisma.race.findUnique({
    where: { id },
    include: {
      raceHorses: { include: { horse: true } },
      results: { include: { horse: true }, orderBy: { actualPosition: "asc" } },
    },
  });

  if (!race) {
    return NextResponse.json({ success: false, error: "Race not found" }, { status: 404 });
  }

  const prediction = await prisma.prediction.findUnique({
    where: { userId_raceId: { userId: user.id, raceId: id } },
    include: { selections: true },
  });

  const rules = await prisma.pointRule.findMany({ where: { isActive: true } });

  const resultByHorse = new Map(
    race.results.map((r) => [r.horseId, r.actualPosition])
  );

  let breakdown: {
    horseName: string;
    predicted: number;
    actual: number;
    pointsEarned: number;
    matchedRules: string[];
  }[] = [];

  if (prediction) {
    const horseMap = new Map(
      race.raceHorses.map((rh) => [rh.horseId, rh.horse.name])
    );

    breakdown = prediction.selections.map((s) => {
      const actual = resultByHorse.get(s.horseId) ?? 0;
      let pointsEarned = 0;
      const matchedRules: string[] = [];

      for (const rule of rules) {
        if (
          rule.type === "CORRECT_POSITION" &&
          rule.position === s.predictedPosition &&
          rule.position === actual
        ) {
          pointsEarned += rule.points;
          matchedRules.push(rule.name);
        }
        if (rule.type === "TOP_N" && rule.topN && actual > 0 && actual <= rule.topN) {
          pointsEarned += rule.points;
          matchedRules.push(rule.name);
        }
      }

      return {
        horseName: horseMap.get(s.horseId) || "Unknown",
        predicted: s.predictedPosition,
        actual,
        pointsEarned,
        matchedRules,
      };
    });
  }

  return NextResponse.json({
    success: true,
      race: {
        ...race,
        startedAt: race.startedAt?.toISOString() || null,
        openedAt: race.openedAt?.toISOString() || null,
        closedAt: race.closedAt?.toISOString() || null,
        results: race.results.map((r) => ({
        horseId: r.horseId,
        horseName: r.horse.name,
        horseNumber: r.horse.number,
        actualPosition: r.actualPosition,
      })),
    },
    prediction: prediction
      ? {
          id: prediction.id,
          totalPoints: prediction.totalPoints,
          submittedAt: prediction.submittedAt.toISOString(),
          selections: prediction.selections.map((s) => ({
            horseId: s.horseId,
            predictedPosition: s.predictedPosition,
          })),
        }
      : null,
    breakdown,
    rules: rules.map((r) => ({
      name: r.name,
      type: r.type,
      position: r.position,
      topN: r.topN,
      points: r.points,
    })),
  });
}
