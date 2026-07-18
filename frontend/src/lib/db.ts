import Database from "better-sqlite3"
import * as fs from "fs"
import * as path from "path"

// ===== Database initialization =====
const DATA_DIR = path.join(process.cwd(), "data")
const DB_PATH = path.join(DATA_DIR, "resume.db")

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new Database(DB_PATH)
db.pragma("journal_mode = WAL")

// ===== Table creation =====
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled Resume',
    content TEXT NOT NULL,
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS job_descriptions (
    id TEXT PRIMARY KEY,
    resumeId TEXT NOT NULL,
    resumeTitle TEXT DEFAULT '',
    jdText TEXT NOT NULL,
    matchScore INTEGER DEFAULT 0,
    missingKeywords TEXT DEFAULT '[]',
    improvementTips TEXT DEFAULT '[]',
    rawAnalysis TEXT DEFAULT '',
    optimizedResume TEXT DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_resumes_userId ON resumes(userId);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_jd_resumeId ON job_descriptions(resumeId);
`)

// ===== Data migration from data.json (first run only) =====
function migrateFromJson() {
  const jsonPath = path.join(process.cwd(), "data.json")
  if (!fs.existsSync(jsonPath)) return
  try {
    const raw = fs.readFileSync(jsonPath, "utf-8")
    const data = JSON.parse(raw)
    const insertUser = db.prepare("INSERT OR IGNORE INTO users (id, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)")
    for (const u of data.users || []) {
      insertUser.run(u.id, u.name || "", u.email, u.password, u.createdAt, u.updatedAt)
    }
    const insertResume = db.prepare("INSERT OR IGNORE INTO resumes (id, title, content, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)")
    for (const r of data.resumes || []) {
      insertResume.run(r.id, r.title, r.content, r.userId, r.createdAt, r.updatedAt)
    }
    fs.renameSync(jsonPath, jsonPath + ".bak")
    console.log("✓ Data migrated from data.json to resume.db")
  } catch (err) {
    console.error("✗ Data migration failed:", err)
  }
}
migrateFromJson()

// ===== Types =====
interface DBUser {
  id: string; name: string; email: string; password: string; createdAt: string; updatedAt: string
}
interface DBResume {
  id: string; title: string; content: string; userId: string; createdAt: string; updatedAt: string
}
interface DBAnalysis {
  id: string; resumeId: string; resumeTitle: string; jdText: string
  matchScore: number; missingKeywords: string; improvementTips: string
  rawAnalysis: string; optimizedResume: string; createdAt: string
}

// ===== Utility =====
function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ===== User operations =====
export function findUserByEmail(email: string): DBUser | null {
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any
  return row || null
}
export function findUserById(id: string): DBUser | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any
  return row || null
}
export function createUser(email: string, password: string, name?: string): DBUser {
  const id = makeId()
  const now = new Date().toISOString()
  db.prepare("INSERT INTO users (id, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, name || email.split("@")[0], email, password, now, now)
  return findUserById(id)!
}

// ===== Resume operations =====
export function findResumesByUserId(userId: string): DBResume[] {
  return db.prepare("SELECT * FROM resumes WHERE userId = ? ORDER BY updatedAt DESC").all(userId) as any
}
export function findResumeById(id: string): DBResume | null {
  const row = db.prepare("SELECT * FROM resumes WHERE id = ?").get(id) as any
  return row || null
}
export function createResume(userId: string, title: string, content: string): DBResume {
  const id = makeId()
  const now = new Date().toISOString()
  db.prepare("INSERT INTO resumes (id, title, content, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, title || "Untitled Resume", content, userId, now, now)
  return findResumeById(id)!
}
export function updateResume(id: string, updates: Partial<Pick<DBResume, "title" | "content">>): DBResume | null {
  const existing = findResumeById(id)
  if (!existing) return null
  const now = new Date().toISOString()
  const title = updates.title !== undefined ? updates.title : existing.title
  const content = updates.content !== undefined ? updates.content : existing.content
  db.prepare("UPDATE resumes SET title = ?, content = ?, updatedAt = ? WHERE id = ?").run(title, content, now, id)
  return findResumeById(id)
}
export function deleteResume(id: string): boolean {
  const existing = findResumeById(id)
  if (!existing) return false
  db.prepare("DELETE FROM resumes WHERE id = ?").run(id)
  return true
}

// ===== Analysis / History operations =====
export function saveAnalysis(data: {
  resumeId: string
  resumeTitle?: string
  jdText: string
  matchScore: number
  missingKeywords: string[]
  improvementTips: string[]
  rawAnalysis?: string
  optimizedResume?: string
}): DBAnalysis {
  const id = makeId()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO job_descriptions (id, resumeId, resumeTitle, jdText, matchScore, missingKeywords, improvementTips, rawAnalysis, optimizedResume, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.resumeId, data.resumeTitle || "", data.jdText,
    data.matchScore, JSON.stringify(data.missingKeywords), JSON.stringify(data.improvementTips),
    data.rawAnalysis || "", data.optimizedResume || "", now
  )
  return getAnalysisById(id)!
}

export function getAnalysisHistory(resumeId?: string): DBAnalysis[] {
  if (resumeId) {
    return db.prepare("SELECT * FROM job_descriptions WHERE resumeId = ? ORDER BY createdAt DESC").all(resumeId) as any
  }
  return db.prepare("SELECT * FROM job_descriptions ORDER BY createdAt DESC").all() as any
}

export function getAnalysisById(id: string): DBAnalysis | null {
  const row = db.prepare("SELECT * FROM job_descriptions WHERE id = ?").get(id) as any
  return row || null
}

export function getAnalysisByResumeId(resumeId: string): DBAnalysis[] {
  return db.prepare("SELECT * FROM job_descriptions WHERE resumeId = ? ORDER BY createdAt DESC").all(resumeId) as any
}

export function updateAnalysisOptimizedResume(id: string, optimizedResume: string): boolean {
  const existing = getAnalysisById(id)
  if (!existing) return false
  db.prepare("UPDATE job_descriptions SET optimizedResume = ? WHERE id = ?").run(optimizedResume, id)
  return true
}
