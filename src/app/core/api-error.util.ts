import { HttpErrorResponse } from '@angular/common/http';

const STATUS_MESSAGES: Record<number, string> = {
  0: 'โหลดข้อมูลไม่สำเร็จ',
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
  const normalized = detail.trim().toLowerCase();
  if (GENERIC_SERVER_DETAILS.has(normalized)) {
    return STATUS_MESSAGES[status] ?? fallback;
  }
  return detail.trim();
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

/** Map HTTP/API failures to a short Thai message for UI. */
export function apiErrorMessage(err: unknown, fallback = 'เกิดข้อผิดพลาด'): string {
  if (err instanceof HttpErrorResponse) {
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
