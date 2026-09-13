import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "session_token";

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const user = await prisma.user.findUnique({
      where: { id: token },
      select: { id: true, phoneNumber: true, name: true, role: true },
    });

    return user ?? null;
  } catch (error) {
    console.error("getSession error:", error);
    return null;
  }
}

export async function deleteSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
  } catch (error) {
    console.error("deleteSession error:", error);
  }
}
