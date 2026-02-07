/**
 * Renders failure_reason string as individual tags/badges.
 * Handles structured ("Brakes, Oil Leak") and "Other: ..." entries.
 */

const KNOWN_REASONS = new Set([
  'Expired TUV/Certification',
  'Brakes',
  'Lights & Signals',
  'Tires & Wheels',
  'Steering',
  'Oil Leak',
  'Engine Issues',
  'Body Damage',
  'Safety Equipment Missing',
  'Electrical Issues',
  'Exhaust & Emissions',
  'Seatbelts',
  'Documentation Issues',
])

export function FailureReasonTags({ value }: { value: string }) {
  // Split by comma, but keep "Other: ..." together
  const parts = value.split(/,\s*(?!.*:)/).map(s => s.trim()).filter(Boolean)

  // If it doesn't look structured (no known reasons and no "Other:"), render as plain text
  const hasStructured = parts.some(p => KNOWN_REASONS.has(p) || p.startsWith('Other:'))
  if (!hasStructured) {
    return <p className="text-sm text-red-600">{value}</p>
  }

  const tags: string[] = []
  let otherText: string | null = null

  for (const part of parts) {
    if (part.startsWith('Other:')) {
      otherText = part.replace('Other:', '').trim()
    } else {
      tags.push(part)
    }
  }

  return (
    <div className="space-y-1.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              {tag}
            </span>
          ))}
        </div>
      )}
      {otherText && (
        <p className="text-sm text-red-600">Other: {otherText}</p>
      )}
    </div>
  )
}
