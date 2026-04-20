import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { getTursoClient } from '@/lib/turso'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const db = getTursoClient()
          const r = await db.execute({
            sql: 'SELECT id, email, name, password_hash FROM users WHERE email = ?',
            args: [credentials.email as string],
          })
          const user = r.rows[0]
          if (!user?.password_hash) return null
          const ok = await bcrypt.compare(
            credentials.password as string,
            String(user.password_hash),
          )
          if (!ok) return null
          return { id: String(user.id), email: String(user.email), name: String(user.name) }
        } catch (err) {
          console.error('[auth] credentials error:', err)
          return null
        }
      },
    }),
  ],

  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },

  callbacks: {
    async signIn({ user, account }) {
      // Upsert OAuth users into our Turso users table
      if (account && account.provider !== 'credentials' && user.email) {
        try {
          const db = getTursoClient()
          const id = user.id ?? user.email
          await db.execute({
            sql: `INSERT INTO users (id, email, name, password_hash, created_at)
                  VALUES (?, ?, ?, NULL, ?)
                  ON CONFLICT(email) DO UPDATE SET name = excluded.name`,
            args: [id, user.email, user.name ?? '', new Date().toISOString()],
          })
          // Ensure id on the user object matches what's in the DB
          user.id = id
        } catch (err) {
          console.error('[auth] upsert OAuth user error:', err)
        }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id
      return token
    },

    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
  },
})
