import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  const seasons = await prisma.season.findMany({
    include: {
      _count: { select: { races: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ success: true, seasons });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json();
    const name = body.name?.trim();
    const startDate = body.startDate;
    const endDate = body.endDate;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Season name is required" },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json(
        { success: false, error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const existing = await prisma.season.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A season with this name already exists" },
        { status: 400 }
      );
    }

    const season = await prisma.season.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json({ success: true, season });
  } catch (error) {
    console.error("Create season error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create season" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json();
    const { id, name, startDate, endDate, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Season ID is required" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (status !== undefined) {
      if (!["UPCOMING", "ACTIVE", "COMPLETED"].includes(status)) {
        return NextResponse.json(
          { success: false, error: "Invalid status" },
          { status: 400 }
        );
      }
      data.status = status;
    }

    if (data.startDate && data.endDate && new Date(data.endDate as string) <= new Date(data.startDate as string)) {
      return NextResponse.json(
        { success: false, error: "End date must be after start date" },
        { status: 400 }
      );
    }

    if (name) {
      const existing = await prisma.season.findFirst({ where: { name: name as string, id: { not: id } } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "A season with this name already exists" },
          { status: 400 }
        );
      }
    }

    const season = await prisma.season.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, season });
  } catch (error) {
    console.error("Update season error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update season" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Season ID is required" },
        { status: 400 }
      );
    }

    const season = await prisma.season.findUnique({
      where: { id },
      include: { races: true },
    });

    if (!season) {
      return NextResponse.json(
        { success: false, error: "Season not found" },
        { status: 404 }
      );
    }

    if (season.races.length > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete season with races. Remove races from this season first." },
        { status: 400 }
      );
    }

    await prisma.season.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete season error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete season" },
      { status: 500 }
    );
  }
}
