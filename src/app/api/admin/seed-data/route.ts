import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function POST() {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const existingHorses = await prisma.horse.count();
    if (existingHorses > 0) {
      return NextResponse.json({ success: false, error: "Data already seeded" }, { status: 400 });
    }

    const horses = await prisma.horse.createMany({
      data: [
        { name: "Thunder Bolt", number: 1 },
        { name: "Silver Storm", number: 2 },
        { name: "Golden Arrow", number: 3 },
        { name: "Dark Knight", number: 4 },
        { name: "Royal Flash", number: 5 },
        { name: "Desert Wind", number: 6 },
        { name: "Crimson Tide", number: 7 },
        { name: "Ocean Dream", number: 8 },
      ],
    });

    const allHorses = await prisma.horse.findMany();
    const horseIds = allHorses.map((h) => h.id);

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const season = await prisma.season.create({
      data: {
        name: "Summer Championship 2026",
        startDate: now,
        endDate: nextMonth,
        status: "ACTIVE",
      },
    });

    const race1 = await prisma.race.create({
      data: {
        name: "Sunday Sprint",
        durationMinutes: 30,
        autoClose: true,
        status: "OPEN",
        startedAt: now,
        seasonId: season.id,
        raceHorses: {
          create: horseIds.slice(0, 6).map((horseId) => ({ horseId })),
        },
      },
    });

    const race2 = await prisma.race.create({
      data: {
        name: "Grand Derby",
        durationMinutes: 60,
        autoClose: false,
        status: "UPCOMING",
        seasonId: season.id,
        raceHorses: {
          create: horseIds.map((horseId) => ({ horseId })),
        },
      },
    });

    const defaultRules = [
      { name: "Correct 1st Place", type: "CORRECT_POSITION" as const, position: 1, points: 10 },
      { name: "Correct 2nd Place", type: "CORRECT_POSITION" as const, position: 2, points: 7 },
      { name: "Correct 3rd Place", type: "CORRECT_POSITION" as const, position: 3, points: 5 },
    ];
    const existingRules = await prisma.pointRule.findMany({ select: { name: true } });
    const existingRuleNames = new Set(existingRules.map((r) => r.name));
    const missingRules = defaultRules.filter((r) => !existingRuleNames.has(r.name));
    if (missingRules.length > 0) {
      await prisma.pointRule.createMany({ data: missingRules });
    }

    return NextResponse.json({
      success: true,
      message: "Test data seeded",
      data: {
        horses: horses.count,
        season: season.name,
        races: [race1.name, race2.name],
      },
    });
  } catch (error) {
    console.error("Seed data error:", error);
    return NextResponse.json({ success: false, error: "Failed to seed data" }, { status: 500 });
  }
}
