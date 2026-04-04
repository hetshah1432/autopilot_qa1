import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'

import * as fs from 'fs'

const envPath = path.resolve(__dirname, '../../../.env')
console.log(`🔍 Loading env from: ${envPath}`)

if (!fs.existsSync(envPath)) {
  console.error(`❌ Root .env file not found at: ${envPath}`)
  process.exit(1)
}

dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
   console.error('❌ Missing Supabase Environment Variables in root .env')
   console.log('Available keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
   process.exit(1)
}

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  async function seedDemo() {
  console.log('🚀 Starting Demo Seeding...')

  // Find email in args or default
  const emailArg = process.argv.find(arg => arg.includes('@'))
  const email = emailArg || 'demo@autopilotqa.com'
  const password = 'Demo1234!'

  console.log(`🚀 Starting Demo Seeding for: ${email}...`)
  console.log('👤 Setting up demo user...')
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Demo Auditor' }
  })

  let userId: string
  if (userError) {
    if (userError.code === 'email_exists' || userError.message.includes('already registered') || userError.message.includes('already exists')) {
       const { data: users } = await supabase.auth.admin.listUsers()
       userId = users.users.find(u => u.email === email)?.id!
       console.log('✅ Demo user already exists, using existing ID:', userId)
    } else {
       throw userError
    }
  } else {
    userId = userData.user.id
    console.log('✅ Demo user created:', userId)
  }

  // 2. Clear old demo projects
  await supabase.from('projects').delete().eq('user_id', userId)

  // 3. Create Demo Projects
  console.log('📁 Creating demo projects...')
  const { data: project1 } = await supabase.from('projects').insert({
    user_id: userId,
    name: 'Autopilot SaaS (Landing)',
    url: 'https://autopilotqa.app',
    description: 'Main product landing page and conversion funnel.'
  }).select().single()

  const { data: project2 } = await supabase.from('projects').insert({
    user_id: userId,
    name: 'Corporate Portal',
    url: 'https://techcorp.com',
    description: 'Internal employee dashboard and news portal.'
  }).select().single()

  const projects = [project1, project2].filter(Boolean)

  for (const project of projects) {
    console.log(`📡 Seeding scans for ${project.name}...`)
    
    // Create 2 scans per project
    const scanDates = [
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    ]

    for (let i = 0; i < 2; i++) {
        const isRecent = i === 1
        const score = isRecent ? 82 : 64
        const issues = isRecent ? 12 : 28

        const { data: scan } = await supabase.from('scans').insert({
           project_id: project.id,
           user_id: userId,
           status: 'complete',
           overall_score: score,
           page_count: isRecent ? 15 : 10,
           issue_count: issues,
           public_token: uuidv4(),
           created_at: scanDates[i].toISOString(),
           started_at: scanDates[i].toISOString(),
           completed_at: new Date(scanDates[i].getTime() + 124000).toISOString()
        }).select().single()

        if (!scan) continue

        // Insert Scan Scores
        await supabase.from('scan_scores').insert({
           scan_id: scan.id,
           overall: score,
           seo: score + 5,
           accessibility: score - 10,
           performance: score + 2,
           security: score + 15,
           ux: score - 5,
           broken_links: score + 10,
           ai_executive_summary: `This audit of ${project.url} shows a ${isRecent ? 'marked improvement' : 'baseline health'} of ${score}%. Key areas of concern include mobile accessibility and LCP performance. Mitigation of critical security headers has improved the overall posture.`,
           ai_summary: `From a development perspective, the codebase exhibits standard compliance but suffers from poor hydration ratios and missing ARIA labels on dynamic elements. The security score is high due to robust CSP headers, but the performance delta between desktop and mobile is significant (>3.4s). Recommended next steps involve optimizing image compression and auditing third-party scripts.`,
           ai_priority_list: JSON.stringify([
              { title: 'Fix LCP', priority: 'critical', impact: 'high' },
              { title: 'ARIA Labels', priority: 'high', impact: 'medium' },
              { title: 'CSS Minify', priority: 'medium', impact: 'low' }
           ])
        })

        // Insert some issues
        const categories = ['seo', 'accessibility', 'performance', 'security', 'ux', 'broken_links']
        for (let j = 0; j < (isRecent ? 5 : 10); j++) {
           await supabase.from('issues').insert({
              scan_id: scan.id,
              page_id: null,
              category: categories[j % 6],
              severity: j % 4 === 0 ? 'critical' : j % 3 === 0 ? 'high' : 'medium',
              title: `Sample Issue ${j+1} for ${categories[j % 6]}`,
              description: `This is a realistic description for a ${categories[j % 6]} issue found during the automated audit. It impacts users on mobile devices disproportionately.`,
              ai_explanation: `This issue occurs because the browser cannot correctly interpret the intended semantic structure, leading to potential layout shifts or screen reader failures.`,
              ai_why_it_matters: `Fixing this will improve your search ranking by up to 12% and reduce bounce rates for assisted technology users.`,
              ai_how_to_fix: `Wrap the interactive elements in a valid <main> tag and ensure all images have alt attributes.`,
              ai_code_snippet: `<div class="btn">Click me</div>\n// Fix:\n<button class="btn" aria-label="Submit">Click me</button>`
           })
        }
    }
  }

  console.log('✅ Seeding Complete! Enjoy the demo.')
}

seedDemo().catch(err => {
  console.error('❌ Seeding Failed:', err)
  process.exit(1)
})
