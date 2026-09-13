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
          race: { select: { startedAt: true } },
        },
      },
    },
  });

  const ranked = users
    .map((u) => {
      let totalSeconds = 0;
      let totalPoints = 0;
      const predictions = u.predictions;

      for (let i = 0; i < predictions.length; i++) {
        const p = predictions[i];
        totalPoints += p.totalPoints;
        if (p.race?.startedAt && p.submittedAt) {
          const diff = Math.floor((p.submittedAt.getTime() - p.race.startedAt.getTime()) / 1000);
          if (diff > 0) totalSeconds += diff;
        }
      }

      return {
        userId: u.id,
        name: u.name || `+91 ${u.phoneNumber}`,
        totalPoints,
        racesPlayed: predictions.length,
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
