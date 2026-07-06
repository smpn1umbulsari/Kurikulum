import type { Metadata } from "next";
import "./globals.css";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SIKAD - Input Nilai",
  description: "Sistem Informasi Kesiswaan dan Akademik Madrasah",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="id">
      <body className="bg-gray-50 antialiased min-h-screen flex flex-col transition-colors duration-200">
        <AccessibilityProvider>
          <Navbar user={user} />
          <main className="flex-1 flex flex-col">{children}</main>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
