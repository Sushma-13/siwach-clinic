import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get('siwach_auth_token')?.value

  if (token) {
    const user = verifyToken(token)
    if (user) redirect('/dashboard')
  }

  redirect('/login')
}
