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
            like: true,
            comments: true,
            reposts: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })

    // Also fetch the user's liked posts to maintain the liked state
    const likedPostIds = await prisma.like.findMany({
      where: { userId },
      select: { postId: true }
    });

    // Add liked status to the response
    const postsWithLikedStatus = repostedPosts.map(post => ({
      ...post,
      isLiked: likedPostIds.some(like => like.postId === post.id)
    }));

    return NextResponse.json(postsWithLikedStatus)
  } catch (err) {
    console.error("Error fetching reposts:", err)
    return NextResponse.json({ error: "Failed to fetch reposts" }, { status: 500 })
  }
} 