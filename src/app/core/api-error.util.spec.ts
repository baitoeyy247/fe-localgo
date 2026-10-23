import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, cancelRequestErrorMessage } from './api-error.util';

const err = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('R41 T4-27c api-error', () => {
  it('never shows ProblemDetails.title', () => {
    expect(apiErrorMessage(err(409, { title: 'Conflict' }))).toBe('ไม่สามารถทำรายการในสถานะปัจจุบัน');
  });
  it('cancel request 409 without detail → Thai reason', () => {
    expect(cancelRequestErrorMessage(err(409, { title: 'Conflict' }))).toBe('งานนี้ไม่อยู่ในสถานะที่ยกเลิกได้');
  });
  it('cancel request 5xx → retry hint once', () => {
    expect(cancelRequestErrorMessage(err(503, { title: 'Service Unavailable' }))).toBe('ระบบขัดข้องชั่วคราว กรุณาลองใหม่');
  });
  it('detail still wins', () => {
    expect(cancelRequestErrorMessage(err(409, { title: 'Conflict', detail: 'งานถูกยกเลิกไปแล้ว' }))).toBe('งานถูกยกเลิกไปแล้ว');
  });
});
