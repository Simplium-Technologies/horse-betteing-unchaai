import { prisma } from "./prisma";

export async function autoTransitionRaces() {
  const now = new Date();

  try {
    const openRaces = await prisma.race.findMany({
      where: {
        status: "OPEN",
      },
    });

    console.log(`[autoClose] Checking ${openRaces.length} open races`);

    for (const race of openRaces) {
      if (!race.autoClose || !race.startedAt) {
        console.log(`[autoClose] Race "${race.name}": skip (autoClose=${race.autoClose}, startedAt=${race.startedAt})`);
        continue;
      }
      const closeTime = new Date(race.startedAt.getTime() + race.durationMinutes * 60 * 1000);
      console.log(`[autoClose] Race "${race.name}": startedAt=${race.startedAt}, duration=${race.durationMinutes}min, closeTime=${closeTime}, now=${now}, shouldClose=${now >= closeTime}`);
      if (now >= closeTime) {
        console.log(`[autoClose] CLOSING race "${race.name}"`);
        await prisma.race.update({
          where: { id: race.id },
          data: { status: "CLOSED", closedAt: closeTime },
        });
      }
    }
  } catch (error) {
    console.error("[autoClose] Error:", error);
  }
}
