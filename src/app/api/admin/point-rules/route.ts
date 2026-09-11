import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

const DEFAULT_POINT_RULES = [
  { name: "Correct 1st Place", type: "CORRECT_POSITION" as const, position: 1, points: 10 },
  { name: "Correct 2nd Place", type: "CORRECT_POSITION" as const, position: 2, points: 7 },
  { name: "Correct 3rd Place", type: "CORRECT_POSITION" as const, position: 3, points: 5 },
];

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const existing = await prisma.pointRule.findMany({
      select: { name: true },
    });
    const existingNames = new Set(existing.map((r) => r.name));
    const missing = DEFAULT_POINT_RULES.filter((r) => !existingNames.has(r.name));
    if (missing.length > 0) {
      await prisma.pointRule.createMany({ data: missing });
    }

    const rules = await prisma.pointRule.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, rules });
  } catch (error) {
    console.error("Get point rules error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json();
    const { name, type, position, topN, points } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Rule name is required" }, { status: 400 });
    }
    if (!type || !["CORRECT_POSITION", "TOP_N"].includes(type)) {
      return NextResponse.json({ success: false, error: "Valid type is required" }, { status: 400 });
    }
    if (type === "CORRECT_POSITION" && (!position || position < 1)) {
      return NextResponse.json({ success: false, error: "Position is required for CORRECT_POSITION" }, { status: 400 });
    }
    if (type === "TOP_N" && (!topN || topN < 1)) {
      return NextResponse.json({ success: false, error: "TopN is required for TOP_N" }, { status: 400 });
    }
    if (!points || points < 1) {
      return NextResponse.json({ success: false, error: "Points must be at least 1" }, { status: 400 });
    }

    const rule = await prisma.pointRule.create({
      data: {
        name: name.trim(),
        type,
        position: type === "CORRECT_POSITION" ? position : null,
        topN: type === "TOP_N" ? topN : null,
        points,
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error("Create point rule error:", error);
    return NextResponse.json({ success: false, error: "Failed to create rule" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json();
    const { id, name, type, position, topN, points, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Rule ID is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = type;
    if (position !== undefined) data.position = position;
    if (topN !== undefined) data.topN = topN;
    if (points !== undefined) data.points = points;
    if (isActive !== undefined) data.isActive = isActive;

    const rule = await prisma.pointRule.update({ where: { id }, data });
    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error("Update point rule error:", error);
    return NextResponse.json({ success: false, error: "Failed to update rule" }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "Rule ID is required" }, { status: 400 });
    }
    await prisma.pointRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete point rule error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete rule" }, { status: 500 });
  }
}
