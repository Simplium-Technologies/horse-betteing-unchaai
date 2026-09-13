import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { role: "PARTICIPANT" },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      predictions: {
        where: { race: { includePoints: true } },
        select: {
          totalPoints: true,
          submittedAt: true,
          selections: {
            select: {
              predictedPosition: true,
              horse: {
                select: { id: true, name: true, number: true },
              },
            },
            orderBy: { predictedPosition: "asc" },
          },
          race: {
            select: {
              id: true,
              name: true,
              status: true,
              startedAt: true,
              season: { select: { name: true } },
              results: {
                select: {
                  actualPosition: true,
                  horse: {
                    select: { id: true, name: true, number: true },
                  },
                },
                orderBy: { actualPosition: "asc" },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  const ranked = users
    .map((u) => {
      let totalSeconds = 0;
      let totalPoints = 0;
      const predictions = u.predictions;

      const breakdown = predictions.map((p) => {
        totalPoints += p.totalPoints;
        let timeTakenSeconds = 0;

        if (p.race?.startedAt && p.submittedAt) {
          const diff = Math.floor((p.submittedAt.getTime() - p.race.startedAt.getTime()) / 1000);
          if (diff > 0) {
            timeTakenSeconds = diff;
            totalSeconds += diff;
          }
        }

        const userSelections = p.selections.map((s) => ({
          position: s.predictedPosition,
          horseId: s.horse.id,
          horseName: s.horse.name,
          horseNumber: s.horse.number,
        }));

        const actualResults = (p.race.results || []).map((r) => ({
          position: r.actualPosition,
          horseId: r.horse.id,
          horseName: r.horse.name,
          horseNumber: r.horse.number,
        }));

        return {
          raceId: p.race.id,
          raceName: p.race.name,
          raceStatus: p.race.status,
          seasonName: p.race.season?.name || null,
          points: p.totalPoints,
          submittedAt: p.submittedAt.toISOString(),
          timeTakenSeconds,
          selections: userSelections,
          results: actualResults,
        };
      });

      return {
        userId: u.id,
        name: u.name || `+91 ${u.phoneNumber}`,
        phoneNumber: u.phoneNumber,
        totalPoints,
        racesPlayed: predictions.length,
        totalSeconds,
        breakdown,
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.totalSeconds - b.totalSeconds;
    })
    .map((entry, i) => ({ rank: i + 1, ...entry }));

  return NextResponse.json({ success: true, leaderboard: ranked });
}
