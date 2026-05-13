import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      redirect('/scan')
    }
  }

  redirect('/login')
}
