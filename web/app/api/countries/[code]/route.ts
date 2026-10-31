import { NextResponse, type NextRequest } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { getCountryStats } from "@/lib/works";

export const GET = handle(async (_request: NextRequest, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  if (!/^[a-z]{2}$/i.test(code)) return jsonError(400, "invalid_code", "Код страны: две латинские буквы, например KZ");
  const stats = await getCountryStats(code.toUpperCase());
  if (stats.total === 0) return jsonError(404, "not_found", "Статей этой страны нет");
  return NextResponse.json({ code: code.toUpperCase(), ...stats });
});
