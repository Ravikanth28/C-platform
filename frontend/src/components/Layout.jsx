import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

export default function Layout() {
  // Open by default on desktop; collapsed (drawer) by default on phones/tablets.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true)
  )

  return (
    <div className="flex h-screen overflow-hidden bg-beige-pg text-t">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
