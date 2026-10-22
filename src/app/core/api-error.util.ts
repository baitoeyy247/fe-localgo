import { HttpErrorResponse } from '@angular/common/http';

const STATUS_MESSAGES: Record<number, string> = {
  0: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบเครือข่ายแล้วลองใหม่',
  400: 'ข้อมูลไม่ครบหรือไม่ถูกต้อง',
  401: 'กรุณาเข้าสู่ระบบใหม่',
  403: 'คุณไม่มีสิทธิ์ทำรายการนี้',
  404: 'ไม่พบข้อมูล',
  408: 'คำขอใช้เวลานานเกินไป ลองใหม่อีกครั้ง',
  409: 'ไม่สามารถทำรายการในสถานะปัจจุบัน',
  422: 'ข้อมูลไม่ผ่านการตรวจสอบ',
  429: 'คุณทำรายการบ่อยเกินไป ลองใหม่ภายหลัง',
  499: 'คำขอถูกยกเลิก',
  500: 'ระบบขัดข้องชั่วคราว',
  502: 'ระบบขัดข้องชั่วคราว',
  503: 'ระบบขัดข้องชั่วคราว',
  504: 'ระบบตอบสนองช้า ลองใหม่อีกครั้ง',
};

const GENERIC_SERVER_DETAILS = new Set([
  'an unexpected error occurred.',
  'server error',
  'internal server error',
]);

type ProblemBody = {
  detail?: string;
  title?: string;
  message?: string;
  errors?: Record<string, string[]>;
};

function firstValidationMessage(errors: Record<string, string[]>): string | null {
  for (const messages of Object.values(errors)) {
    const first = messages?.find((m) => typeof m === 'string' && m.trim());
    if (first) {
      return first.trim();
    }
  }
  return null;
}

function normalizeDetail(detail: string, status: number, fallback: string): string {
  const trimmed = detail.trim();
  if (trimmed.includes('ถูกระงับ') || trimmed.includes('บัญชีนี้ถูกระงับ')) {
    return 'บัญชีนี้ถูกระงับ';
  }
  const normalized = trimmed.toLowerCase();
  if (GENERIC_SERVER_DETAILS.has(normalized)) {
    return STATUS_MESSAGES[status] ?? fallback;
  }
  return trimmed;
}

function messageFromBody(body: ProblemBody | null, status: number, fallback: string): string | null {
  if (!body) {
    return null;
  }
  const validation = body.errors ? firstValidationMessage(body.errors) : null;
  if (validation) {
    return validation;
  }
  const raw = body.detail ?? body.title ?? body.message;
  if (typeof raw === 'string' && raw.trim()) {
    return normalizeDetail(raw, status, fallback);
  }
  return null;
}

function retryAfterHint(err: HttpErrorResponse): string | null {
  if (err.status !== 429) {
    return null;
  }
  const raw = err.headers.get('Retry-After');
  const sec = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(sec) && sec > 0) {
    return `คุณทำรายการบ่อยเกินไป ลองใหม่ภายใน ${sec} วินาที`;
  }
  const fromDetail = messageFromBody(err.error as ProblemBody | null, 429, '');
  if (fromDetail?.includes('วินาที')) {
    return fromDetail;
  }
  return STATUS_MESSAGES[429] ?? null;
}

/** Map HTTP/API failures to a short Thai message for UI. */
export function apiErrorMessage(err: unknown, fallback = 'เกิดข้อผิดพลาด'): string {
  if (err instanceof HttpErrorResponse) {
    const rateLimited = retryAfterHint(err);
    if (rateLimited) {
      return rateLimited;
    }
    const fromBody = messageFromBody(err.error as ProblemBody | null, err.status, fallback);
    if (fromBody) {
      return fromBody;
    }
    return STATUS_MESSAGES[err.status] ?? fallback;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

/** R39 T4-28: the server's ProblemDetails text (detail/title/message), or null when absent. */
export function apiErrorDetail(err: unknown): string | null {
  if (err instanceof HttpErrorResponse) {
    return messageFromBody(err.error as ProblemBody | null, err.status, '');
  }
  return null;
}

/** R39 T4-27: cancel-appointment failure; a 409 with no detail gets an appointment-specific reason. */
export function cancelAppointmentErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status === 409 && !apiErrorDetail(err)) {
    return 'นัดหมายนี้ไม่อยู่ในสถานะที่ยกเลิกได้';
  }
  return apiErrorMessage(err, 'ยกเลิกนัดหมายไม่สำเร็จ');
}
