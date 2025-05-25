import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const likedPosts = await prisma.post.findMany({
      where: {
        like: {
          some: {
            userId,
          },
        },
      },
      include: {
        author: true,
        _count: {
          select: {
            like: true,
            comment: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(likedPosts)
  } catch (err) {
    console.error("Error fetching liked posts:", err)
    return NextResponse.json({ error: "Failed to fetch liked posts" }, { status: 500 })
  }
} 