import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const githubConfigured = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      name: "Dev login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        const expectedEmail = (process.env.AUTH_DEV_EMAIL || "teacher@localhost").toLowerCase();
        const expectedPassword = process.env.AUTH_DEV_PASSWORD || "virtuallabs";
        if (!email || !sameSecret(email, expectedEmail) || !sameSecret(password, expectedPassword)) {
          return null;
        }
        const user = await prisma.user.upsert({
          where: { email },
          update: { name: "Teacher" },
          create: { email, name: "Teacher" },
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    ...(githubConfigured ? [GitHub] : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials" && user?.id) token.sub = user.id;
      if (account?.provider === "github" && user?.email) {
        const saved = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (saved) token.sub = saved.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "github") {
        const email = user.email ?? (typeof profile?.email === "string" ? profile.email : null);
        if (!email) return false;
        const saved = await prisma.user.upsert({
          where: { email: email.toLowerCase() },
          update: { name: user.name, image: user.image },
          create: { email: email.toLowerCase(), name: user.name, image: user.image },
        });
        user.id = saved.id;
      }
      return true;
    },
  },
});
