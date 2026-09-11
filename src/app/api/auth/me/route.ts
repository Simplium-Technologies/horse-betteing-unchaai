import { getSession } from "@/lib/session";
import { autoTransitionRaces } from "@/lib/races";
import { NextResponse } from "next/server";

export async function GET() {
  await autoTransitionRaces();
  const user = await getSession();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true, user });
}
