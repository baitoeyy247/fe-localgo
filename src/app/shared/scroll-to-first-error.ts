/** Scroll to the first visible form error and focus an invalid control when possible. */
export function scrollToFirstError(): void {
  if (typeof document === 'undefined') {
    return;
  }
  window.setTimeout(() => {
    const marker = document.querySelector(
      '.error-text, [aria-invalid="true"], .form-field--error',
    );
    marker?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const focusTarget = document.querySelector<HTMLElement>(
      '.form-field--error input, .form-field--error select, .form-field--error textarea, [aria-invalid="true"]',
    );
    focusTarget?.focus({ preventScroll: true });
  }, 0);
}
