const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: "file:D:\\综合测试文件夹\\resume-optimizer\\frontend\\prisma\\dev.db" } }
});
prisma.user.findMany()
  .then(users => { console.log("Prisma OK: Users:", users.length); return prisma.$disconnect(); })
  .then(() => process.exit(0))
  .catch(e => { console.error("Error:", e.message); process.exit(1); });
