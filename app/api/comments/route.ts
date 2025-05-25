// app/api/comments/route.ts
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { postId, userId, content } = await req.json()

    if (!postId || !userId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        content,
      },
      include: {
        user: true,
      },
    })

    // Fetch updated post data with counts
    const updatedPost = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
        _count: {
          select: {
            like: true,
            comments: true,
            reposts: true
          }
        }
      }
    })

    return NextResponse.json({ comment, post: updatedPost }, { status: 201 })
  } catch (err) {
    console.error("Create comment error:", err)
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
  }
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get("postId")
    const userId = searchParams.get("userId")

    if (!postId && !userId) {
      return NextResponse.json({ error: "Missing postId or userId" }, { status: 400 })
    }

    if (userId) {
      // Get all posts that the user has commented on
      const posts = await prisma.post.findMany({
        where: {
          comments: {
            some: {
              userId: userId
            }
          }
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
        }
      });
      return NextResponse.json(posts);
    }

    // Get comments for a specific post
    const comments = await prisma.comment.findMany({
      where: { postId: postId! },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(comments)
  } catch (err) {
    console.error("Fetch comments error:", err)
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}
  
