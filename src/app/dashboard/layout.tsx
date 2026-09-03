import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-lg text-blue-600">
              VoiceAI
            </Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="hover:text-blue-600">
                Dashboard
              </Link>
              <Link href="/dashboard/businesses" className="hover:text-blue-600">
                Businesses
              </Link>
              <Link href="/dashboard/workflows" className="hover:text-blue-600">
                Workflows
              </Link>
              <Link
                href="/dashboard/conversations"
                className="hover:text-blue-600"
              >
                Conversations
              </Link>
              <Link href="/dashboard/simulator" className="hover:text-blue-600">
                Simulator
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <Button variant="outline" size="sm" type="submit">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white border-b px-4 py-2 flex gap-4 overflow-x-auto text-sm">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/dashboard/businesses">Businesses</Link>
        <Link href="/dashboard/workflows">Workflows</Link>
        <Link href="/dashboard/conversations">Conversations</Link>
        <Link href="/dashboard/simulator">Simulator</Link>
      </div>

      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
