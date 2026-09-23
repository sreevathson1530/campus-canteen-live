import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { getMenu } from "@/lib/menu/service";

export const dynamic = "force-dynamic";

export const GET = handler(async () => NextResponse.json(await getMenu()));
