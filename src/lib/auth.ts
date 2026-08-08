import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: String(credentials.email) } });
        if (!user) return null;
        const valid = await bcrypt.compare(String(credentials.password), user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name || undefined };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) { if (user) token.id = user.id; return token; },
    session({ session, token }) { if (session.user) (session.user as any).id = token.id; return session; },
  },
  session: { strategy: "jwt" },
});
