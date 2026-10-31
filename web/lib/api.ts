import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Оборачивает обработчик: неожиданные ошибки возвращаются как JSON 500, а не HTML. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(error);
      return jsonError(500, "internal_error", "Внутренняя ошибка сервера");
    }
  };
}
