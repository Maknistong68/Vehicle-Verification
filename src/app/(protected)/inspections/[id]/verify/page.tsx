import { redirect } from 'next/navigation'

// Verification functionality has been removed.
// All access to this route is redirected to /lookup.
export default async function VerifyInspectionPage() {
  redirect('/lookup')
}
