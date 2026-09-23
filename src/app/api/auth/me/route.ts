import { NextResponse } from "next/server";
import { apiError, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toPublicUser } from "@/lib/users/service";

export const GET = handler(async () => {
  const session = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) apiError("UNAUTHORIZED", "Please sign in");
  return NextResponse.json({ user: toPublicUser(user) });
});
