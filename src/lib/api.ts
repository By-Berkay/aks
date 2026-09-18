import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

export type ApiError = { code: string; message: string; details?: unknown };

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message, details } },
    { status },
  );
}

export { AppError, Errors } from "@/lib/errors";
import { AppError } from "@/lib/errors";

/**
 * Route handler sarmalayicisi: beklenmeyen hatalari loglar,
 * kullaniciya teknik olmayan tek tip mesaj doner.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(err.code, err.message, err.status, err.details);
      }
      if (err instanceof ZodError) {
        return fail("VALIDATION_ERROR", "Gonderilen bilgiler gecersiz.", 422, err.flatten());
      }
      logger.error({ err }, "Beklenmeyen API hatasi");
      return fail("INTERNAL_ERROR", "Islem sirasinda bir hata olustu. Islem tamamlanmadi.", 500);
    }
  };
}
