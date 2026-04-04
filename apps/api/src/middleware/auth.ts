import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  }
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const queryToken =
      typeof req.query.access_token === 'string' ? req.query.access_token : undefined

    let token: string | undefined
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    } else if (queryToken) {
      // EventSource in browsers cannot set Authorization; allow token query for SSE only routes
      token = queryToken
    }

    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }
    // Verify token using Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: error?.message || 'Invalid token' })
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email
    }

    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(500).json({ error: 'Internal Server Error during authentication' })
  }
}
