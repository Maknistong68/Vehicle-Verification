import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, getAssignmentStatusVariant, getInspectionStatusVariant, getInspectionResultVariant } from '@/components/status-badge'
import { UserRole } from '@/lib/types'
import Link from 'next/link'
import { AssignmentActions } from './assignment-actions'

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const role = profile.role as UserRole

  const { data: assignment } = await supabase
    .from('assignments')
    .select(`
      id, company_id, scheduled_date, status, notes, created_at,
      company:companies(id, name),
      inspector:user_profiles!assignments_inspector_id_fkey(full_name),
      assigner:user_profiles!assignments_assigned_by_fkey(full_name)
    `)
    .eq('id', id)
    .single()

  if (!assignment) redirect('/assignments')

  // Fetch linked inspections
  const { data: inspections } = await supabase
    .from('inspections')
    .select(`
      id, status, result, scheduled_date, completed_at,
      vehicle_equipment:vehicles_equipment(plate_number)
    `)
    .eq('assignment_id', id)
    .order('created_at', { ascending: false })

  const canManage = role === 'owner' || role === 'admin'
  const canUpdateStatus = canManage || role === 'inspector'
  const companyId = (assignment.company as any)?.id || assignment.company_id

  return (
    <>
      <PageHeader
        title="Assignment Details"
        action={
          <div className="flex items-center gap-2">
            {canUpdateStatus && assignment.status !== 'done' && (
              <Link
                href={`/inspections/new?assignment_id=${assignment.id}&company_id=${companyId}`}
                className="btn-primary w-full sm:w-auto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Start Inspections
              </Link>
            )}
            {canManage && assignment.status !== 'done' && (
              <Link href={`/assignments/${assignment.id}/edit`} className="btn-secondary w-full sm:w-auto">
                Edit
              </Link>
            )}
          </div>
        }
      />

      {/* Assignment Info Card */}
      <div className="glass-card p-5 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Company</p>
            <p className="text-sm font-medium text-gray-900">{(assignment.company as any)?.name || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Inspector</p>
            <p className="text-sm text-gray-600">{(assignment.inspector as any)?.full_name || 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Assigned By</p>
            <p className="text-sm text-gray-600">{(assignment.assigner as any)?.full_name || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Scheduled Date</p>
            <p className="text-sm text-gray-900">{new Date(assignment.scheduled_date).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
            <StatusBadge label={assignment.status} variant={getAssignmentStatusVariant(assignment.status)} />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Created</p>
            <p className="text-sm text-gray-500">{new Date(assignment.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        {assignment.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-600">{assignment.notes}</p>
          </div>
        )}

        {/* Status action buttons */}
        {canUpdateStatus && assignment.status !== 'done' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <AssignmentActions assignmentId={assignment.id} currentStatus={assignment.status} />
          </div>
        )}
      </div>

      {/* Linked Inspections */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Linked Inspections</h2>
          <p className="text-xs text-gray-400 mt-0.5">{(inspections || []).length} inspection(s) linked to this assignment</p>
        </div>
        {(inspections || []).length > 0 ? (
          <div className="divide-y divide-gray-100">
            {inspections!.map((insp: any) => (
              <div key={insp.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{insp.vehicle_equipment?.plate_number || 'Unknown Vehicle'}</p>
                  <p className="text-xs text-gray-400">{new Date(insp.scheduled_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={insp.result} variant={getInspectionResultVariant(insp.result)} />
                  <StatusBadge label={insp.status.replace(/_/g, ' ')} variant={getInspectionStatusVariant(insp.status)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm">No inspections linked yet</p>
            <p className="text-gray-300 text-xs mt-1">Click "Start Inspections" to begin</p>
          </div>
        )}
      </div>
    </>
  )
}
