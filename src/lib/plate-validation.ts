/**
 * Plate number validation utilities.
 * Rules based on Excel data: alphanumeric only, 4–17 chars.
 */

/** Strip spaces, dashes, and non-alphanumeric chars, normalize Arabic/Eastern numerals, then uppercase. */
export function cleanPlateNumber(raw: string): string {
  return raw
    .replace(/[\u0660-\u0669]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48))  // Arabic-Indic ٠-٩ → 0-9
    .replace(/[\u06F0-\u06F9]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48))  // Extended Arabic-Indic ۰-۹ → 0-9
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
}

/** Returns error message string if invalid, or null if valid. */
export function validatePlateNumber(plate: string): string | null {
  if (!plate) return 'Plate number is required'
  if (!/^[A-Z0-9]+$/.test(plate)) return 'Plate number must contain only letters and numbers'
  if (plate.length < 4) return 'Plate number must be at least 4 characters'
  if (plate.length > 17) return 'Plate number must be at most 17 characters'
  return null
}
