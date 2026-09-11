import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  const horses = await prisma.horse.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ success: true, horses });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json();
    const name = body.name?.trim();
    const number = body.number ? parseInt(body.number) : null;
    const imageUrl = body.imageUrl?.trim() || null;
    const description = body.description?.trim() || null;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Horse name is required" },
        { status: 400 }
      );
    }

    if (!number || number < 1) {
      return NextResponse.json(
        { success: false, error: "Horse number is required" },
        { status: 400 }
      );
    }

    const existingName = await prisma.horse.findUnique({ where: { name } });
    if (existingName) {
      return NextResponse.json(
        { success: false, error: "A horse with this name already exists" },
        { status: 400 }
      );
    }

    const existingNumber = await prisma.horse.findUnique({ where: { number } });
    if (existingNumber) {
      return NextResponse.json(
        { success: false, error: "A horse with this number already exists" },
        { status: 400 }
      );
    }

    const horse = await prisma.horse.create({
      data: { name, number, imageUrl, description },
    });

    return NextResponse.json({ success: true, horse });
  } catch (error) {
    console.error("Create horse error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create horse" },
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
    const { id, name, number, imageUrl, isActive, description } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Horse ID is required" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (number !== undefined) {
      const num = parseInt(number);
      if (num < 1) {
        return NextResponse.json(
          { success: false, error: "Horse number must be at least 1" },
          { status: 400 }
        );
      }
      const existingNumber = await prisma.horse.findFirst({ where: { number: num, id: { not: id } } });
      if (existingNumber) {
        return NextResponse.json(
          { success: false, error: "A horse with this number already exists" },
          { status: 400 }
        );
      }
      data.number = num;
    }
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null;
    if (isActive !== undefined) data.isActive = isActive;
    if (description !== undefined) data.description = description?.trim() || null;

    const horse = await prisma.horse.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, horse });
  } catch (error) {
    console.error("Update horse error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update horse" },
      { status: 500 }
    );
  }
}
