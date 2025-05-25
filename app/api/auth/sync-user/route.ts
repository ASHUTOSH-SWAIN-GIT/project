// app/api/auth/sync-user/route.ts
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authId, email, name, avatarUrl } = body

    if (!authId || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const user = await prisma.user.upsert({
      where: { authId },
      update: { email, name, avatarUrl },
      create: { authId, email, name, avatarUrl },
    })

    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    console.error("Sync user error:", error)
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 })
  }
}
