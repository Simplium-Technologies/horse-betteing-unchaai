import { getSession } from "./session";

export async function requireAdmin() {
  const user = await getSession();

  if (!user) {
    return { error: "Not authenticated", status: 401 as const };
  }

  if (user.role !== "ADMIN") {
    return { error: "Forbidden", status: 403 as const };
  }

  return { user };
}
