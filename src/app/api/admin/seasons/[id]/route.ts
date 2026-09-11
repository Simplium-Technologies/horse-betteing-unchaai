import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  const { id } = await params;

  const season = await prisma.season.findUnique({
    where: { id },
    include: {
      _count: { select: { races: true } },
    },
  });

  if (!season) {
    return NextResponse.json({ success: false, error: "Season not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, season });
}
