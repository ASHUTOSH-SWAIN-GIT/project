import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // For now, return an empty array since repost functionality is not implemented
    return NextResponse.json([])
  } catch (err) {
    console.error("Error fetching reposts:", err)
    return NextResponse.json({ error: "Failed to fetch reposts" }, { status: 500 })
  }
} 