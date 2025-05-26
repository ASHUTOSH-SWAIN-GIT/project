import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const { userId, postId } = await req.json()

    if (!userId || !postId) {
      return NextResponse.json({ error: "Missing userId or postId" }, { status: 400 })
    }

    const repost = await prisma.repost.create({
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

    return NextResponse.json({ repost, post: updatedPost }, { status: 201 })
  } catch (err: unknown) {
    // Handle unique constraint error (user already reposted this post)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Post already reposted by this user" }, { status: 409 })
    }

    console.error("Error reposting post:", err)
    return NextResponse.json({ error: "Failed to repost" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { userId, postId } = await req.json()

  try {
    await prisma.repost.delete({
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

    return NextResponse.json({ message: "Post unreposted", post: updatedPost })
  } catch (err) {
    console.error("Error unreposting post:", err)
    return NextResponse.json({ error: "Failed to unrepost" }, { status: 500 })
  }
} 