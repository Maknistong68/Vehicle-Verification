/**
 * Input sanitization utilities for user-provided text.
 * Prevents stored XSS by stripping HTML/script tags before database insertion.
 */

/** Strip HTML tags and trim whitespace. */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/<[^>]*>/g, '')  // Strip HTML tags
    .replace(/&lt;/g, '<')     // Decode common entities first...
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, '')  // ...then strip any decoded tags
    .trim()
}

/** Sanitize and enforce max length. Returns null if empty after sanitization. */
export function sanitizeField(
  input: string | null | undefined,
  maxLength: number
): string | null {
  const cleaned = sanitizeText(input)
  if (!cleaned) return null
  return cleaned.slice(0, maxLength)
}

/** Validate that a string is a valid UUID v4. */
export function isValidUuid(value: string | null | undefined): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/** Validate ISO datetime string. */
export function isValidDatetime(value: string | null | undefined): boolean {
  if (!value) return false
  const d = new Date(value)
  return !isNaN(d.getTime())
}

/** Validate that a value is one of allowed options. */
export function isOneOf<T extends string>(value: string | null | undefined, allowed: readonly T[]): value is T {
  if (!value) return false
  return (allowed as readonly string[]).includes(value)
}
