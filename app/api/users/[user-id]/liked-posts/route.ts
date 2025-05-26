import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  // Extract userId from the URL path
  const url = new URL(req.url)
  const pathParts = url.pathname.split("/")
  const userId = pathParts[pathParts.indexOf("users") + 1]

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

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
