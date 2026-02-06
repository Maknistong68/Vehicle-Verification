'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserRole } from './types'

interface RoleContextValue {
  actualRole: UserRole
  effectiveRole: UserRole
  viewAsRole: UserRole | null
  setViewAsRole: (role: UserRole | null) => void
  isOwnerPOV: boolean
}

const RoleContext = createContext<RoleContextValue | null>(null)

const STORAGE_KEY = 'vvs1-pov-role'

export function RoleProvider({ actualRole, children }: { actualRole: UserRole; children: ReactNode }) {
  const [viewAsRole, setViewAsRoleState] = useState<UserRole | null>(null)

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (actualRole !== 'owner') return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored !== 'owner' && ['admin', 'inspector', 'contractor', 'verifier'].includes(stored)) {
      setViewAsRoleState(stored as UserRole)
    }
  }, [actualRole])

  const setViewAsRole = (role: UserRole | null) => {
    setViewAsRoleState(role)
    if (role && role !== 'owner') {
      localStorage.setItem(STORAGE_KEY, role)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const isOwnerPOV = actualRole === 'owner' && viewAsRole !== null
  const effectiveRole = actualRole === 'owner' && viewAsRole ? viewAsRole : actualRole

  return (
    <RoleContext.Provider value={{ actualRole, effectiveRole, viewAsRole, setViewAsRole, isOwnerPOV }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within a RoleProvider')
  return ctx
}
