import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  hasPermission,
  type Permission,
  type Role,
} from "@/lib/permissions";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(permission?: Permission | Permission[]) {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("Unauthorized", 401);
  }

  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];
    const allowed = perms.some((p) =>
      hasPermission(session.user.role as Role, p)
    );
    if (!allowed) {
      throw new ApiError("Forbidden", 403);
    }
  }

  await connectDB();
  return session;
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error) {
    const isValidation =
      error.name === "ValidationError" ||
      error.message.includes("required") ||
      error.message.includes("duplicate");
    return NextResponse.json(
      { error: error.message },
      { status: isValidation ? 400 : 500 }
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
