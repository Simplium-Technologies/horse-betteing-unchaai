import { prisma } from "./prisma";

const DEFAULT_POINT_RULES = [
  { name: "Correct 1st Place", type: "CORRECT_POSITION" as const, position: 1, points: 10 },
  { name: "Correct 2nd Place", type: "CORRECT_POSITION" as const, position: 2, points: 7 },
  { name: "Correct 3rd Place", type: "CORRECT_POSITION" as const, position: 3, points: 5 },
];

async function ensureDefaultRules() {
  const existing = await prisma.pointRule.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = DEFAULT_POINT_RULES.filter((r) => !existingNames.has(r.name));
  if (missing.length > 0) {
    await prisma.pointRule.createMany({ data: missing });
  }
}

export async function calculateRacePoints(raceId: string) {
  await ensureDefaultRules();

  const predictions = await prisma.prediction.findMany({
    where: { raceId },
    include: { selections: true },
  });

  const results = await prisma.raceResult.findMany({
    where: { raceId },
  });

  const rules = await prisma.pointRule.findMany({
    where: { isActive: true },
  });

  const resultByHorse = new Map(
    results.map((r) => [r.horseId, r.actualPosition])
  );

  const updates = predictions.map((prediction) => {
    let totalPoints = 0;

    for (const selection of prediction.selections) {
      const actualPosition = resultByHorse.get(selection.horseId);
      if (actualPosition === undefined) continue;

      for (const rule of rules) {
        if (
          rule.type === "CORRECT_POSITION" &&
          rule.position === selection.predictedPosition &&
          rule.position === actualPosition
        ) {
          totalPoints += rule.points;
        }

        if (rule.type === "TOP_N" && rule.topN && actualPosition <= rule.topN) {
          totalPoints += rule.points;
        }
      }
    }

    return prisma.prediction.update({
      where: { id: prediction.id },
      data: { totalPoints },
    });
  });

  if (updates.length > 0) {
    // Execute in small batches with an extended timeout so large races never roll back
    const BATCH_SIZE = 10;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(batch, { timeout: 20000 });
    }
  }
}
