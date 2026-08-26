import { createContext, useContext } from 'react'

// Default is 'admin' so that cookie-auth users see everything unchanged
// until Clerk is wired up (VITE_CLERK_PUBLISHABLE_KEY set in Vercel).
export const RoleContext = createContext({ role: 'admin', isAdmin: true, isLoaded: true })

export function useRole() {
  return useContext(RoleContext)
}
