import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId

  try {
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
        like: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(likedPosts)
  } catch (err) {
    console.error("Error fetching liked posts", err)
    return NextResponse.json({ error: "Failed to fetch liked posts" }, { status: 500 })
  }
}
