import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

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
      },
    })

    return NextResponse.json(like, { status: 201 })
  } catch (err: any) {
    // Handle unique constraint error (user already liked this post)
    if (err.code === "P2002") {
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
  
      return NextResponse.json({ message: "Post unliked" })
    } catch (err) {
      console.error("Error unliking post:", err)
      return NextResponse.json({ error: "Failed to unlike post" }, { status: 500 })
    }
  }
  