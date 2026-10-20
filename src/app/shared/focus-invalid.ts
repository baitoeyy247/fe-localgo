const FIELD_ORDER = [
  '#post-category',
  '#post-title',
  '#post-description',
  '#post-budget',
  '#service-category',
  '#service-title',
  '#service-price',
  '#profile-type',
  '#profile-name',
  '#profile-phone',
];

export function focusFirstInvalid(): void {
  const fields = FIELD_ORDER.map((selector) => document.querySelector(selector)).filter(
    (field): field is HTMLElement => field instanceof HTMLElement,
  );
  const invalid =
    fields.find((field) => field.getAttribute('aria-invalid') === 'true') ??
    document.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!invalid) {
    return;
  }
  const top = invalid.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top: Math.max(0, top) });
  invalid.focus();
}
