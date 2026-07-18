import { PrismaClient } from "@prisma/client"

let prismaInstance: PrismaClient | null = null

declare global {
  var __prisma: PrismaClient | undefined
}

export function getPrisma(): PrismaClient {
  if (globalThis.__prisma) return globalThis.__prisma
  
  if (!prismaInstance) {
    const databaseUrl = process.env.DATABASE_URL || "file:./dev.db"
    prismaInstance = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    })
  }
  
  if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = prismaInstance
  }
  
  return prismaInstance
}

// Keep a default export for backward compatibility
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = getPrisma()
    return (client as any)[prop]
  },
})
