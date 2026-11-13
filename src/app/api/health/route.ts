import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    ok: true,
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    authTrustHost: process.env.AUTH_TRUST_HOST || null,
    authUrl: process.env.AUTH_URL || null,
    vercel: Boolean(process.env.VERCEL),
  };

  try {
    await connectDB();
    const users = await User.countDocuments({ isActive: true });
    checks.mongo = "connected";
    checks.activeUsers = users;
    if (users === 0) {
      checks.ok = false;
      checks.hint =
        "Database has no active users. Run: MONGODB_URI=... npm run seed";
    }
  } catch (error) {
    checks.ok = false;
    checks.mongo = "error";
    checks.mongoError =
      error instanceof Error ? error.message : "MongoDB connection failed";
  }

  if (!process.env.AUTH_SECRET) {
    checks.ok = false;
    checks.authHint = "Missing AUTH_SECRET on this deployment";
  }

  return NextResponse.json(checks, { status: checks.ok ? 200 : 503 });
}
