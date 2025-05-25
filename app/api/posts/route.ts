// app/api/posts/route.ts
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    const posts = await prisma.post.findMany({
      where: userId ? { authorId: userId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { author: true, },
    })

    return NextResponse.json(posts)
  } catch (err) {
    console.error("Fetch posts error:", err)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, authorId, mediaUrl } = await req.json()

    if (!content || !authorId) {
      return NextResponse.json({ error: "Missing content or authorId" }, { status: 400 })
    }

    const post = await prisma.post.create({
      data: {
        content,
        authorId,
        mediaUrl,
      },
      include: {
        author: true,
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (err) {
    console.error("Create post error:", err)
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 })
  }
}
