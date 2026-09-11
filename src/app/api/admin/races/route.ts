import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { autoTransitionRaces } from "@/lib/races";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  await autoTransitionRaces();

  const races = await prisma.race.findMany({
    include: {
      season: true,
      raceHorses: true,
      _count: { select: { predictions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, races });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json();
    const { name, durationMinutes, autoClose, horseIds, seasonId, includePoints } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Race name is required" }, { status: 400 });
    }
    if (!durationMinutes || durationMinutes < 1) {
      return NextResponse.json({ success: false, error: "Duration must be at least 1 minute" }, { status: 400 });
    }
    if (!horseIds?.length || horseIds.length < 2) {
      return NextResponse.json({ success: false, error: "At least 2 horses are required" }, { status: 400 });
    }

    if (seasonId) {
      const season = await prisma.season.findUnique({ where: { id: seasonId } });
      if (!season) {
        return NextResponse.json({ success: false, error: "Season not found" }, { status: 404 });
      }
    }

    const race = await prisma.race.create({
      data: {
        name: name.trim(),
        durationMinutes: Number(durationMinutes),
        autoClose: Boolean(autoClose),
        includePoints: includePoints !== false,
        status: "UPCOMING",
        seasonId: seasonId || null,
        raceHorses: {
          create: horseIds.map((horseId: string) => ({ horseId })),
        },
      },
      include: { raceHorses: true },
    });

    return NextResponse.json({ success: true, race });
  } catch (error) {
    console.error("Create race error:", error);
    return NextResponse.json({ success: false, error: "Failed to create race" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json();
    const { id, name, durationMinutes, autoClose, horseIds, status, seasonId, includePoints } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Race ID is required" }, { status: 400 });
    }

    const existing = await prisma.race.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Race not found" }, { status: 404 });
    }

    if (existing.status !== "UPCOMING" && (name || durationMinutes !== undefined || autoClose !== undefined || horseIds)) {
      return NextResponse.json(
        { success: false, error: "Can only edit race details when status is UPCOMING" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (durationMinutes !== undefined) data.durationMinutes = Number(durationMinutes);
    if (autoClose !== undefined) data.autoClose = Boolean(autoClose);
    if (status !== undefined) data.status = status;
    if (seasonId !== undefined) data.seasonId = seasonId || null;
    if (includePoints !== undefined) data.includePoints = Boolean(includePoints);

    if (horseIds && existing.status === "UPCOMING") {
      await prisma.raceHorse.deleteMany({ where: { raceId: id } });
      await prisma.raceHorse.createMany({
        data: horseIds.map((horseId: string) => ({ raceId: id, horseId })),
      });
    }

    const race = await prisma.race.update({
      where: { id },
      data,
      include: { raceHorses: true },
    });

    return NextResponse.json({ success: true, race });
  } catch (error) {
    console.error("Update race error:", error);
    return NextResponse.json({ success: false, error: "Failed to update race" }, { status: 500 });
  }
}
