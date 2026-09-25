import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { getPulse } from "@/lib/pulse";

export const dynamic = "force-dynamic";

export const GET = handler(async () => NextResponse.json(await getPulse()));
