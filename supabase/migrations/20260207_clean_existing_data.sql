-- Migration: Clean existing plate numbers + map free-text failure reasons to structured format
-- Date: 2026-02-07
-- Safe: Only normalizes formatting, no data loss

-- ============================================================
-- 1. PLATE NUMBER CLEANUP
-- Uppercase + strip non-alphanumeric characters
-- ============================================================

UPDATE vehicles_equipment
SET plate_number = UPPER(REGEXP_REPLACE(plate_number, '[^A-Za-z0-9]', '', 'g'))
WHERE plate_number IS DISTINCT FROM UPPER(REGEXP_REPLACE(plate_number, '[^A-Za-z0-9]', '', 'g'));

-- ============================================================
-- 2. FAILURE REASON MAPPING
-- Map free-text failure_reason to structured comma-separated categories
-- Only affects inspections where result = 'fail' and failure_reason is not null
--
-- Strategy: Check if the free text contains keywords for each category.
-- If multiple match, they are comma-separated.
-- If none match, prefix with "Other: " to preserve the original text.
-- ============================================================

UPDATE inspections
SET failure_reason = (
  SELECT
    CASE
      WHEN array_length(matched, 1) > 0 THEN array_to_string(matched, ', ')
      ELSE 'Other: ' || orig
    END
  FROM (
    SELECT
      inspections.failure_reason AS orig,
      ARRAY(
        SELECT unnest FROM unnest(ARRAY[
          CASE WHEN inspections.failure_reason ~* '(tuv|tüv|certification|certificate|expired cert)' THEN 'Expired TUV/Certification' END,
          CASE WHEN inspections.failure_reason ~* '(brake|braking)' THEN 'Brakes' END,
          CASE WHEN inspections.failure_reason ~* '(light|signal|headlight|taillight|indicator|lamp)' THEN 'Lights & Signals' END,
          CASE WHEN inspections.failure_reason ~* '(tire|tyre|wheel|rim)' THEN 'Tires & Wheels' END,
          CASE WHEN inspections.failure_reason ~* '(steer|steering)' THEN 'Steering' END,
          CASE WHEN inspections.failure_reason ~* '(oil leak|oil leaking|leaking oil)' THEN 'Oil Leak' END,
          CASE WHEN inspections.failure_reason ~* '(engine|motor)' THEN 'Engine Issues' END,
          CASE WHEN inspections.failure_reason ~* '(body damage|dent|scratch|rust|corrosion|broken glass|windshield|mirror)' THEN 'Body Damage' END,
          CASE WHEN inspections.failure_reason ~* '(safety equipment|fire extinguisher|first aid|triangle|reflective|vest|ppe)' THEN 'Safety Equipment Missing' END,
          CASE WHEN inspections.failure_reason ~* '(electric|wiring|battery|fuse|alternator)' THEN 'Electrical Issues' END,
          CASE WHEN inspections.failure_reason ~* '(exhaust|emission|smoke|catalytic)' THEN 'Exhaust & Emissions' END,
          CASE WHEN inspections.failure_reason ~* '(seatbelt|seat belt|belt)' THEN 'Seatbelts' END,
          CASE WHEN inspections.failure_reason ~* '(document|registration|insurance|license|licence|permit|paper)' THEN 'Documentation Issues' END
        ]) WHERE unnest IS NOT NULL
      ) AS matched
  ) sub
)
WHERE result = 'fail'
  AND failure_reason IS NOT NULL
  AND failure_reason != ''
  -- Skip already-structured entries (contain known categories)
  AND failure_reason !~ '^(Expired TUV/Certification|Brakes|Lights & Signals|Tires & Wheels|Steering|Oil Leak|Engine Issues|Body Damage|Safety Equipment Missing|Electrical Issues|Exhaust & Emissions|Seatbelts|Documentation Issues|Other:)';
