import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { pool } from "@/lib/db";

export const GET = handle(async () => {
  const { rows } = await pool.query(
    `select c as code, count(*)::int as count from works cross join unnest(countries) c
     group by c order by count desc, c`,
  );
  return NextResponse.json(rows);
});
