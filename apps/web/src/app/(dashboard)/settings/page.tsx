'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { 
  User, 
  ShieldCheck, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert,
  Server,
  Key,
  Terminal,
  Save,
  LogOut,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { cn } from 'utils'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { ConfirmDialog } from '@/components/ui/Feedback'

type Tab = 'profile' | 'danger'

export default function SettingsPage() {
  const { user, session, signOut, supabase } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  // Initialize name when user loads
  useEffect(() => {
    if (user?.user_metadata?.full_name && !name) {
      setName(user.user_metadata.full_name)
    }
  }, [user, name])

  const { data: status } = useQuery({
     queryKey: ['api-status'],
     queryFn: async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/status`)
        return res.json()
     }
  })

  const { data: projectCount } = useQuery({
     queryKey: ['all-projects-count'],
     queryFn: async () => {
        const { count, error } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
        if (error) throw error
        return count || 0
     },
     enabled: !!user
  })

  const handleSaveProfile = async () => {
     setIsSaving(true)
     try {
        const { error } = await supabase.auth.updateUser({ data: { full_name: name } })
        if (error) throw error
        toast.success('Profile updated')
     } catch (err: any) {
        toast.error(err.message)
     } finally {
        setIsSaving(false)
     }
  }

  const handleDeleteAllProjects = async () => {
     try {
        toast.loading('Wiping all projects and audit data...', { id: 'bulk-delete' })
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('user_id', user?.id)

        if (error) throw error
        
        toast.success('Workspace cleared: All projects and scans deleted', { id: 'bulk-delete' })
        setConfirmClear(false)
        // Refresh router to show empty state
        window.location.reload()
     } catch (err: any) {
        toast.error(err.message, { id: 'bulk-delete' })
     }
  }

  const handleDeleteAccount = async () => {
     try {
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`, {
         method: 'DELETE',
         headers: { 'Authorization': `Bearer ${session?.access_token}` }
       })
       if (!res.ok) throw new Error('Deletion failed')
       toast.success('Account deleted successfully')
       signOut()
     } catch (err: any) {
       toast.error(err.message)
     }
  }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'danger', label: 'Danger Zone', icon: ShieldAlert },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex flex-col gap-1">
         <h1 className="text-3xl font-bold">Settings</h1>
         <p className="text-[#64748b]">Manage your account, API keys, and platform preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation */}
        <aside className="w-full md:w-56 shrink-0 flex flex-col gap-1">
          {TABS.map((t) => (
            <button 
               key={t.id}
               onClick={() => setActiveTab(t.id)}
               className={cn(
                 "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                 activeTab === t.id ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" : "text-[#64748b] hover:bg-white/5 hover:text-white border border-transparent"
               )}
            >
               <t.icon className={cn("w-4 h-4", activeTab === t.id ? "text-indigo-400" : "text-[#64748b]")} />
               {t.label}
            </button>
          ))}
          <button 
             onClick={() => signOut()}
             className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-400/10 transition-all mt-4 border border-transparent"
          >
             <LogOut className="w-4 h-4" />
             Sign Out
          </button>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
           <AnimatePresence mode="wait">
             {activeTab === 'profile' && (
                <motion.div 
                   key="profile"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-8"
                >
                   <div className="bg-[#0d0d14] border border-white/5 rounded-3xl p-8 space-y-8 shadow-2xl">
                      <div className="flex items-center gap-6">
                         <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-600/30">
                            {user?.email?.[0].toUpperCase() || 'U'}
                         </div>
                         <div>
                            <p className="text-xl font-bold">{user?.user_metadata?.full_name || 'Autopilot User'}</p>
                             <p className="text-[#64748b] text-sm truncate">
                                {user?.email} 
                             </p>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Full Name</label>
                            <input 
                               value={name}
                               onChange={(e) => setName(e.target.value)}
                               className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-medium"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Email Address</label>
                            <input 
                               value={user?.email || ''}
                               readOnly
                               className="w-full bg-white/[0.02] border border-white/5 text-[#64748b] cursor-not-allowed rounded-2xl px-6 py-4 outline-none font-medium"
                            />
                            <p className="text-[10px] text-[#64748b] italic">Email cannot be changed in the beta version.</p>
                         </div>
                      </div>
                      
                      <button 
                         onClick={handleSaveProfile}
                         disabled={isSaving}
                         className="flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all disabled:opacity-50"
                      >
                         {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                         Save Changes
                      </button>
                   </div>
                </motion.div>
             )}


             {activeTab === 'danger' && (
                <motion.div 
                   key="danger"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-6"
                >
                   <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 space-y-8">
                      <div className="flex items-center gap-4 text-red-400">
                         <AlertTriangle className="w-8 h-8" />
                         <div>
                            <h2 className="text-xl font-bold">Heads Up!</h2>
                            <p className="text-sm opacity-60">These actions are irreversible. Proceed with extreme caution.</p>
                         </div>
                      </div>

                      <div className="divide-y divide-red-500/10">
                         <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <p className="font-bold text-lg text-red-500">Delete All Projects</p>
                              <p className="text-xs text-[#a0a0b0]">Wipe all {projectCount || 0} projects and their entire audit history. **This cannot be undone.**</p>
                            </div>
                            <button 
                               onClick={() => setConfirmClear(true)}
                               className="px-6 py-2.5 border border-red-500/50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/10 transition-all"
                            >
                               Delete All Projects
                            </button>
                         </div>

                         <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                               <p className="font-bold text-lg">Delete Account</p>
                               <p className="text-xs text-[#a0a0b0]">Permanently erase your account and all associated data.</p>
                            </div>
                            <button 
                               onClick={() => setConfirmDelete(true)}
                               className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
                            >
                               Delete Account
                            </button>
                         </div>
                      </div>
                   </div>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      <ConfirmDialog 
         isOpen={confirmClear}
         onCancel={() => setConfirmClear(false)}
         onConfirm={handleDeleteAllProjects}
         title="Delete Everything?"
         description="This will permanently delete all your projects, including every scan and report. Your account will remain, but your workspace will be completely empty."
         confirmLabel="Wipe Workspace"
         confirmVariant="danger"
      />

      <ConfirmDialog 
         isOpen={confirmDelete}
         onCancel={() => setConfirmDelete(false)}
         onConfirm={handleDeleteAccount}
         title="Delete your account?"
         description="Are you sure? This will remove all your projects, scans, and personal data from our servers forever."
         confirmLabel="Delete Account"
         confirmVariant="danger"
      />
    </div>
  )
}
