import NextAuth from "next-auth";

// Edge-compatible auth config (no DB imports)
export const { auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).roles = token.roles;
      }
      return session;
    },
  },
});
