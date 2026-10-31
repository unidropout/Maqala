import { NextResponse, type NextRequest } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { getWork } from "@/lib/works";

export const GET = handle(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return jsonError(400, "invalid_id", "id должен быть положительным числом");
  const work = await getWork(Number(id));
  if (!work) return jsonError(404, "not_found", "Статья не найдена");
  return NextResponse.json(work);
});
