// pages/api/auth/sync-user.ts
import { prisma } from "@/lib/prisma"
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const { authId, email, name, avatarUrl } = req.body

  if (!authId || !email) return res.status(400).json({ error: "Missing fields" })

  try {
    // Upsert user
    const user = await prisma.user.upsert({
      where: { authId },
      update: { email, name, avatarUrl },
      create: { authId, email, name, avatarUrl },
    })

    res.status(200).json(user)
  } catch (error) {
    console.error("Sync user error:", error)
    res.status(500).json({ error: "Failed to sync user" })
  }
}
