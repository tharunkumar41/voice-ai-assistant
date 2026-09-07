"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { PageSpinner } from "@/components/ui/spinner";

export default function BusinessesPage() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function loadBusinesses() {
    setListLoading(true);
    const { data } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
    setBusinesses(data || []);
    setListLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("businesses").insert({
      owner_id: user.id,
      name,
      industry,
      phone,
      language_pref: language,
    });

    if (!error) {
      setName("");
      setIndustry("");
      setPhone("");
      await loadBusinesses();
    } else {
      alert(error.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Business Profiles</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Business</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Business Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Sweet Delights Cake Shop"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Industry</label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                placeholder="Bakery / Cake Shop"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone (optional)</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Preferred Language</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Business"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {listLoading ? (
          <PageSpinner label="Loading businesses..." />
        ) : businesses.length === 0 ? (
          <p className="text-sm text-gray-400">No businesses yet — create one above.</p>
        ) : (
          businesses.map((b) => (
            <Card key={b.id}>
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-sm text-gray-500">
                    {b.industry} • {b.language_pref === "hi" ? "Hindi" : "English"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/workflows?business=${b.id}`)}
                >
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
