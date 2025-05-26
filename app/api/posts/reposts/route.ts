import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const repostedPosts = await prisma.post.findMany({
      where: {
        reposts: {
          some: {
            userId,
          },
        },
      },
      include: {
        author: true,
        _count: {
          select: {
            comments: true,
            reposts: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(repostedPosts)
  } catch (err) {
    console.error("Error fetching reposts:", err)
    return NextResponse.json({ error: "Failed to fetch reposts" }, { status: 500 })
  }
} 