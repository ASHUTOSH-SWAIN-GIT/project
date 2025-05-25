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

    return NextResponse.json(comment, { status: 201 })
  } catch (err) {
    console.error("Create comment error:", err)
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
  }
}


export async function GET(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url)
      const postId = searchParams.get("postId")
  
      if (!postId) {
        return NextResponse.json({ error: "Missing postId" }, { status: 400 })
      }
  
      const comments = await prisma.comment.findMany({
        where: { postId },
        include: { user: true }, // include commenter info
        orderBy: { createdAt: "asc" }, // oldest first
      })
  
      return NextResponse.json(comments)
    } catch (err) {
      console.error("Fetch comments error:", err)
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
    }
  }
  
