const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:3001";

export async function notifyWS(event: string, data: unknown) {
  fetch(`${WS_SERVER_URL}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, data }),
  }).catch(() => {});
}
