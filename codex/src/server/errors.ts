export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFound(message = "Không tìm thấy dữ liệu."): HttpError {
  return new HttpError(404, "NOT_FOUND", message);
}

export function forbidden(message = "Bạn không có quyền thực hiện thao tác này."): HttpError {
  return new HttpError(403, "FORBIDDEN", message);
}

export function conflict(message = "Dữ liệu đã được người khác cập nhật. Hãy làm mới rồi thử lại."): HttpError {
  return new HttpError(409, "VERSION_CONFLICT", message);
}
