import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user!.id);

  const { count: conversationCount } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true });

  const { count: pendingCount } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("follow_up_status", "pending");

  const { data: recent } = await supabase
    .from("conversations")
    .select("*, workflows(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/dashboard/workflows">
          <Button>Create Workflow</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Businesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversationCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingCount || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Businesses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {businesses && businesses.length > 0 ? (
              businesses.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-sm text-gray-500">{b.industry}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-3">No business yet</p>
                <Link href="/dashboard/businesses">
                  <Button size="sm">Create Business Profile</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {recent && recent.length > 0 ? (
              <div className="space-y-2">
                {recent.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium">
                        {c.caller_name || "Unknown"} • {c.caller_phone || "—"}
                      </p>
                      <p className="text-gray-500">
                        {c.workflows?.name || "Workflow"}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        c.follow_up_status === "pending"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {c.follow_up_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                No conversations yet. Try the Simulator.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
