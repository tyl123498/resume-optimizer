import { NextResponse } from "next/server"
import { createUser, findUserByEmail } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }
    const existing = findUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }
    const user = createUser(email, password, name)
    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Registration failed: " + String(error) }, { status: 500 })
  }
}
