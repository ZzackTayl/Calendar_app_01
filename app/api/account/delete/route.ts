import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export async function POST() {
  try {
    const supabase = createClientComponentClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // TODO: Implement secure deletion workflow (admin function / background job)
    // For now, acknowledge request so UI can proceed.
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
