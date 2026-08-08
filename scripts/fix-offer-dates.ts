import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: "file:./dev.db" }) });

function subBusinessDays(date: Date, days: number): Date {
  const d = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() - 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) remaining--; // skip weekends
  }
  return d;
}

async function main() {
  const hired = await prisma.candidate.findMany({
    where: { currentStage: "已入职" },
  });

  let updated = 0;
  for (const c of hired) {
    if (c.offerDate) continue; // already has offer date
    if (!c.onboardDate) {
      console.log(`SKIP ${c.name}: no onboard date`);
      continue;
    }

    const offerDate = subBusinessDays(c.onboardDate, 2);
    await prisma.candidate.update({
      where: { id: c.id },
      data: { offerDate },
    });
    updated++;
    console.log(`✅ ${c.name}: offer=${offerDate.toISOString().slice(0,10)} | onboard=${c.onboardDate.toISOString().slice(0,10)}`);
  }

  console.log(`\nDone. Updated ${updated} candidates.`);
  await prisma.$disconnect();
}

main().catch(console.error);
