export async function notifyWS(event: string, data: unknown) {
  const serverUrl = process.env.NEXT_PUBLIC_WS_SERVER_URL || "http://localhost:3001";

  fetch(`${serverUrl}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, data }),
  }).catch((err) => {
    console.error("Failed to notify WebSocket server:", err);
  });
}
