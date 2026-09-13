import { getSession } from "@/lib/session";
import { autoTransitionRaces } from "@/lib/races";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await autoTransitionRaces();
  } catch (err) {
    console.error("autoTransitionRaces error in /api/auth/me:", err);
  }

  const user = await getSession();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }

  return NextResponse.json(
    { success: true, user },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
