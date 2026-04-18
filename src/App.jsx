import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import PoolView from './pages/PoolView'
import CompForm from './pages/CompForm'
import Profile from './pages/Profile'

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  const [view, setView] = useState('dashboard')
  const [activePool, setActivePool] = useState(null)
  const [editingComp, setEditingComp] = useState(null)

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--dim)', fontFamily: 'var(--font-m)', fontSize: '0.75rem', letterSpacing: '.1em' }}>
      Loading…
    </div>
  )

  if (!user) return <Auth onSignIn={signIn} onSignUp={signUp} />

  if (view === 'profile') {
    return (
      <Profile
        user={user}
        theme={theme}
        onToggleTheme={toggle}
        onBack={() => setView('dashboard')}
      />
    )
  }

  if ((view === 'addComp' || view === 'editComp') && activePool) {
    return (
      <CompForm
        pool={activePool}
        comp={editingComp}
        theme={theme}
        onToggleTheme={toggle}
        onBack={() => { setView('pool'); setEditingComp(null) }}
        onSaved={() => { setView('pool'); setEditingComp(null) }}
      />
    )
  }

  if (view === 'pool' && activePool) {
    return (
      <PoolView
        pool={activePool}
        theme={theme}
        onToggleTheme={toggle}
        onBack={() => { setView('dashboard'); setActivePool(null) }}
        onAddComp={() => { setEditingComp(null); setView('addComp') }}
        onEditComp={comp => { setEditingComp(comp); setView('editComp') }}
      />
    )
  }

  return (
    <Dashboard
      user={user}
      theme={theme}
      onToggleTheme={toggle}
      onOpenPool={pool => { setActivePool(pool); setView('pool') }}
      onOpenProfile={() => setView('profile')}
      onSignOut={signOut}
    />
  )
}
