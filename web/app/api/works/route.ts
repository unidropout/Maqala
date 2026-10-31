import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { PAGE_SIZE, parseFilters, searchWorks } from "@/lib/works";

export const GET = handle(async (request: NextRequest) => {
  const filters = parseFilters(request.nextUrl.searchParams);
  const { total, items } = await searchWorks(filters);
  return NextResponse.json({ total, page: filters.page, page_size: PAGE_SIZE, filters, items });
});
