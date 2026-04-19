import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import PoolView from './pages/PoolView'
import PropertyForm from './pages/PropertyForm'
import PropertiesPage from './pages/PropertiesPage'
import Profile from './pages/Profile'
import ModelSettings from './pages/ModelSettings'

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  const [view,             setView]             = useState('dashboard')
  const [activePool,       setActivePool]       = useState(null)
  const [editingProperty,  setEditingProperty]  = useState(null)

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

  if (view === 'modelSettings') {
    return (
      <ModelSettings
        user={user}
        theme={theme}
        onToggleTheme={toggle}
        onBack={() => setView('dashboard')}
      />
    )
  }

  if (view === 'properties') {
    return (
      <PropertiesPage
        user={user}
        theme={theme}
        onToggleTheme={toggle}
        onBack={() => setView('dashboard')}
        onAddProperty={() => { setActivePool(null); setEditingProperty(null); setView('addProperty') }}
        onEditProperty={prop => { setActivePool(null); setEditingProperty(prop); setView('editProperty') }}
      />
    )
  }

  if (view === 'addProperty' || view === 'editProperty') {
    const fromPool = !!activePool && view === 'addProperty'
    return (
      <PropertyForm
        user={user}
        property={editingProperty}
        contextLabel={activePool?.name ?? 'Properties'}
        theme={theme}
        onToggleTheme={toggle}
        onBack={() => {
          setView(activePool ? 'pool' : 'properties')
          setEditingProperty(null)
        }}
        onSaved={async (property) => {
          if (fromPool) {
            await supabase
              .from('pool_properties')
              .insert({ pool_id: activePool.id, property_id: property.id })
            await supabase
              .from('comp_pools')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', activePool.id)
          }
          setView(activePool ? 'pool' : 'properties')
          setEditingProperty(null)
        }}
      />
    )
  }

  if (view === 'pool' && activePool) {
    return (
      <PoolView
        pool={activePool}
        user={user}
        theme={theme}
        onToggleTheme={toggle}
        onBack={() => { setView('dashboard'); setActivePool(null) }}
        onAddProperty={() => { setEditingProperty(null); setView('addProperty') }}
        onEditProperty={prop => { setEditingProperty(prop); setView('editProperty') }}
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
      onOpenProperties={() => setView('properties')}
      onOpenModelSettings={() => setView('modelSettings')}
      onSignOut={signOut}
    />
  )
}
