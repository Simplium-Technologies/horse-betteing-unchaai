import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const leaderboard = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      predictions: {
        select: {
          totalPoints: true,
          raceId: true,
          submittedAt: true,
          race: { select: { startedAt: true } },
        },
      },
    },
  });

  const ranked = leaderboard
    .map((u) => {
      let totalSeconds = 0;
      u.predictions.forEach((p) => {
        if (p.race.startedAt && p.submittedAt) {
          const diff = Math.floor((p.submittedAt.getTime() - p.race.startedAt.getTime()) / 1000);
          if (diff > 0) totalSeconds += diff;
        }
      });
      return {
        userId: u.id,
        name: u.name || `+91 ${u.phoneNumber}`,
        totalPoints: u.predictions.reduce((sum, p) => sum + p.totalPoints, 0),
        racesPlayed: u.predictions.length,
        totalSeconds,
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
