const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || "file:./dev.db" } }
});
console.log("PrismaClient created, testing connection...");
prisma.user.findMany()
  .then(users => { console.log("Connected! Users:", users.length); return prisma.$disconnect(); })
  .then(() => { console.log("Disconnected"); process.exit(0); })
  .catch(e => { console.error("Error:", e.message); process.exit(1); });
