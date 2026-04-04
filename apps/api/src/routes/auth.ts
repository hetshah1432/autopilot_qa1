import { Router, Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { supabase } from '../lib/supabase'

const router = Router()

// DELETE User Account
router.delete('/user', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // 1. Delete user from auth table (Admin only)
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId)
    
    if (deleteErr) {
       console.error("Error deleting user from auth:", deleteErr)
       return res.status(500).json({ success: false, error: deleteErr.message })
    }

    // Projects and scans should be deleted via ON DELETE CASCADE in Postgres.
    // If not, they will remain as orphaned data but associated with a non-existent user.

    return res.json({ success: true, data: null })
  } catch (err: any) {
    console.error("Account deletion failed:", err)
    return res.status(500).json({ success: false, error: "Internal Server Error" })
  }
})

export default router
