// Framework'ten bagimsiz hata tipleri. Bu dosya next/* import etmez,
// boylece servis ve test katmanlarinda serbestce kullanilabilir.

export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  unauthorized: () => new AppError("UNAUTHORIZED", "Oturum bulunamadi veya suresi dolmus.", 401),
  forbidden: (msg = "Bu islem icin yetkiniz yok.") => new AppError("FORBIDDEN", msg, 403),
  notFound: (msg = "Kayit bulunamadi.") => new AppError("NOT_FOUND", msg, 404),
  conflict: (msg: string) => new AppError("CONFLICT", msg, 409),
  limit: (msg: string) => new AppError("LIMIT_EXCEEDED", msg, 422),
  validation: (details?: unknown) =>
    new AppError("VALIDATION_ERROR", "Gonderilen bilgiler gecersiz.", 422, details),
  tooMany: () => new AppError("TOO_MANY_REQUESTS", "Cok fazla deneme yaptiniz. Lutfen bekleyin.", 429),
};
