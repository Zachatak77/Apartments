import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import PoolView from './pages/PoolView'
import CompareView from './pages/CompareView'
import PropertyForm from './pages/PropertyForm'
import PropertiesPage from './pages/PropertiesPage'
import Profile from './pages/Profile'
import ModelSettings from './pages/ModelSettings'
import NavBar from './components/NavBar'
import NavDrawer from './components/NavDrawer'

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  const [view,            setView]            = useState('dashboard')
  const [activePool,      setActivePool]      = useState(null)
  const [editingProperty, setEditingProperty] = useState(null)
  const [activeTab,       setActiveTab]       = useState('comps')
  const [navOpen,         setNavOpen]         = useState(false)

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--dim)', fontFamily: 'var(--font-m)', fontSize: '0.75rem', letterSpacing: '.1em' }}>
      Loading…
    </div>
  )

  if (!user) return <Auth onSignIn={signIn} onSignUp={signUp} />

  const isFormView = view === 'addProperty' || view === 'editProperty'

  const formBack = () => {
    setView(activePool ? 'pool' : 'properties')
    setEditingProperty(null)
  }

  const backHandler = isFormView ? formBack
    : view === 'compare' ? () => setView('pool')
    : null

  const navigate = (dest) => {
    if (dest === 'dashboard') setActivePool(null)
    setView(dest)
    setNavOpen(false)
  }

  return (
    <>
      <NavBar
        onMenuOpen={() => setNavOpen(true)}
        onBack={backHandler}
        backLabel={activePool?.name ?? 'Back'}
      />

      <NavDrawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        view={view}
        pool={activePool}
        activeTab={activeTab}
        onTabChange={tab => { setActiveTab(tab); setView('pool'); setNavOpen(false) }}
        onOpenCompare={() => { setView('compare'); setNavOpen(false) }}
        onNavigate={navigate}
        user={user}
        onSignOut={signOut}
      />

      {view === 'dashboard' && (
        <Dashboard
          user={user}
          onOpenPool={pool => { setActivePool(pool); setActiveTab('comps'); setView('pool') }}
          onOpenProfile={() => setView('profile')}
          onOpenProperties={() => setView('properties')}
          onOpenModelSettings={() => setView('modelSettings')}
          onSignOut={signOut}
        />
      )}

      {view === 'pool' && activePool && (
        <PoolView
          pool={activePool}
          user={user}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddProperty={() => { setEditingProperty(null); setView('addProperty') }}
          onEditProperty={prop => { setEditingProperty(prop); setView('editProperty') }}
        />
      )}

      {view === 'compare' && activePool && (
        <CompareView
          pool={activePool}
          onBack={() => setView('pool')}
          onEditProperty={prop => { setEditingProperty(prop); setView('editProperty') }}
        />
      )}

      {view === 'properties' && (
        <PropertiesPage
          user={user}
          onAddProperty={() => { setActivePool(null); setEditingProperty(null); setView('addProperty') }}
          onEditProperty={prop => { setActivePool(null); setEditingProperty(prop); setView('editProperty') }}
        />
      )}

      {isFormView && (
        <PropertyForm
          user={user}
          property={editingProperty}
          contextLabel={activePool?.name ?? 'Properties'}
          onBack={formBack}
          onSaved={async (property) => {
            if (view === 'addProperty' && activePool) {
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
      )}

      {view === 'profile' && (
        <Profile user={user} />
      )}

      {view === 'modelSettings' && (
        <ModelSettings user={user} theme={theme} onToggleTheme={toggle} />
      )}
    </>
  )
}
