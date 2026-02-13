'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type NavMode = 'sidebar' | 'topnav'

interface NavigationContextType {
  navMode: NavMode
  setNavMode: (mode: NavMode) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggleNavMode: () => void
  toggleCollapse: () => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [navMode, setNavModeState] = useState<NavMode>('sidebar')
  const [isCollapsed, setIsCollapsedState] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const savedNavMode = localStorage.getItem('navMode') as NavMode | null
    const savedCollapsed = localStorage.getItem('sidebarCollapsed')
    
    if (savedNavMode) setNavModeState(savedNavMode)
    if (savedCollapsed) setIsCollapsedState(savedCollapsed === 'true')
  }, [])

  const setNavMode = (mode: NavMode) => {
    setNavModeState(mode)
    localStorage.setItem('navMode', mode)
  }

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed)
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  }

  const toggleNavMode = () => {
    const newMode = navMode === 'sidebar' ? 'topnav' : 'sidebar'
    setNavMode(newMode)
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <NavigationContext.Provider
      value={{
        navMode,
        setNavMode,
        isCollapsed,
        setIsCollapsed,
        toggleNavMode,
        toggleCollapse,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
