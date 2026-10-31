import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { getFacets, parseFilters } from "@/lib/works";

export const GET = handle(async (request: NextRequest) => {
  return NextResponse.json(await getFacets(parseFilters(request.nextUrl.searchParams)));
});
