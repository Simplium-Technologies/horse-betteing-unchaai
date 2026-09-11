import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

const validTransitions: Record<string, string[]> = {
  UPCOMING: ["OPEN"],
  OPEN: ["CLOSED"],
  CLOSED: ["COMPLETED"],
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 });
    }

    const race = await prisma.race.findUnique({ where: { id } });
    if (!race) {
      return NextResponse.json({ success: false, error: "Race not found" }, { status: 404 });
    }

    const allowed = validTransitions[race.status];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Cannot change status from ${race.status} to ${status}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };

    if (status === "OPEN") {
      updateData.startedAt = new Date();
      updateData.openedAt = new Date();
    }

    if (status === "CLOSED") {
      updateData.closedAt = new Date();
    }

    const updated = await prisma.race.update({
      where: { id },
      data: updateData,
    });

    fetch("http://localhost:3001/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "race:status_changed", data: { raceId: id, status, closedAt: updated.closedAt?.toISOString() } }),
    }).catch(() => {});

    return NextResponse.json({ success: true, race: updated });
  } catch (error) {
    console.error("Update race status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}
