import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { findUserByEmail } from "@/lib/db"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = findUserByEmail(credentials.email)
        if (!user) return null
        if (user.password !== credentials.password) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
})

export { handler as GET, handler as POST }
