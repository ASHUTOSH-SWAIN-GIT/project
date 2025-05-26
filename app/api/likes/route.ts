import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
export async function POST(req: NextRequest) {
  try {
    const { userId, postId } = await req.json()

    if (!userId || !postId) {
      return NextResponse.json({ error: "Missing userId or postId" }, { status: 400 })
    }

    const like = await prisma.like.create({
      data: {
        userId,
        postId,
      }
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

    return NextResponse.json({ like, post: updatedPost }, { status: 201 })
  } catch (err: unknown) {
    // Handle unique constraint error (user already liked this post)
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Post already liked by this user" }, { status: 409 })
    }

    console.error("Error liking post:", err)
    return NextResponse.json({ error: "Failed to like post" }, { status: 500 })
  }
}

// DELETE /api/likes
export async function DELETE(req: NextRequest) {
  const { userId, postId } = await req.json()

  try {
    await prisma.like.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
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

    return NextResponse.json({ message: "Post unliked", post: updatedPost })
  } catch (err) {
    console.error("Error unliking post:", err)
    return NextResponse.json({ error: "Failed to unlike post" }, { status: 500 })
  }
}
  