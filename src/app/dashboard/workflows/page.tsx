"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateId } from "@/lib/utils";
import { WorkflowQuestion, WorkflowCondition } from "@/types";
import { useSearchParams } from "next/navigation";
import { PageSpinner } from "@/components/ui/spinner";

const PRESETS = {
  cake: {
    name: "Cake Shop – Missed Call Order",
    greeting:
      "Hi! Thanks for calling Sweet Delights. We missed your call. Are you looking to order a cake or do you have a general enquiry?",
    closing:
      "Thank you! We've noted your cake requirements. Our team will call you back shortly to confirm. Have a sweet day!",
    questions: [
      { id: "q1", label: "Customer name", type: "text" as const, required: true },
      { id: "q2", label: "Phone number", type: "phone" as const, required: true },
      {
        id: "q3",
        label: "What would you like? (Order cake / General enquiry)",
        type: "select" as const,
        required: true,
        options: ["Order a cake", "General enquiry"],
      },
      { id: "q4", label: "Cake type / flavour", type: "text" as const, required: true },
      { id: "q5", label: "Weight (kg)", type: "number" as const, required: true },
      { id: "q6", label: "Required date", type: "date" as const, required: true },
      { id: "q7", label: "Custom message on cake", type: "text" as const, required: false },
      {
        id: "q8",
        label: "Delivery or Pickup?",
        type: "select" as const,
        required: true,
        options: ["Delivery", "Pickup"],
      },
      { id: "q9", label: "Budget (approx)", type: "text" as const, required: false },
    ],
    conditions: [
      {
        id: "c1",
        fieldId: "q6",
        operator: "less_than_hours" as const,
        value: 24,
        action: "set_urgent" as const,
        message: "Required within 24 hours → mark urgent",
      },
    ],
  },
  clinic: {
    name: "Clinic – Appointment Request",
    greeting:
      "Hello, thank you for calling City Care Clinic. We missed your call. Would you like to book, reschedule, cancel an appointment, or make an enquiry?",
    closing:
      "Thank you. Your request has been recorded. Our receptionist will confirm shortly. Take care!",
    questions: [
      { id: "q1", label: "Patient full name", type: "text" as const, required: true },
      { id: "q2", label: "Phone number", type: "phone" as const, required: true },
      {
        id: "q3",
        label: "What do you need?",
        type: "select" as const,
        required: true,
        options: ["Book appointment", "Reschedule", "Cancel", "Enquiry"],
      },
      { id: "q4", label: "Preferred doctor or speciality", type: "text" as const, required: true },
      { id: "q5", label: "Preferred date", type: "date" as const, required: true },
      { id: "q6", label: "Preferred time", type: "text" as const, required: true },
    ],
    conditions: [],
  },
};

export default function WorkflowsPage() {
  const searchParams = useSearchParams();
  const preselectedBusiness = searchParams.get("business");

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState(preselectedBusiness || "");
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [closing, setClosing] = useState("");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [questions, setQuestions] = useState<WorkflowQuestion[]>([]);
  const [conditions, setConditions] = useState<WorkflowCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setDataLoading(true);
    const { data: b } = await supabase.from("businesses").select("*");
    setBusinesses(b || []);
    if (b && b.length > 0 && !selectedBusiness) {
      setSelectedBusiness(b[0].id);
    }

    const { data: w } = await supabase
      .from("workflows")
      .select("*, businesses(name)")
      .order("created_at", { ascending: false });
    setWorkflows(w || []);
    setDataLoading(false);
  }

  function loadPreset(key: "cake" | "clinic") {
    const p = PRESETS[key];
    setName(p.name);
    setGreeting(p.greeting);
    setClosing(p.closing);
    setQuestions(p.questions);
    setConditions(p.conditions);
    setShowBuilder(true);
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        id: generateId(),
        label: "",
        type: "text",
        required: true,
      },
    ]);
  }

  async function handleSave() {
    if (!selectedBusiness || !name || !greeting) {
      alert("Please fill required fields and select a business");
      return;
    }
    setLoading(true);

    const { error } = await supabase.from("workflows").insert({
      business_id: selectedBusiness,
      name,
      greeting,
      closing_message: closing,
      language,
      questions,
      conditions,
      actions: [{ id: generateId(), type: "create_enquiry" }],
      is_active: true,
    });

    if (error) {
      alert(error.message);
    } else {
      setShowBuilder(false);
      setName("");
      setGreeting("");
      setClosing("");
      setQuestions([]);
      await loadData();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => loadPreset("cake")}>
            + Cake Shop Preset
          </Button>
          <Button variant="outline" onClick={() => loadPreset("clinic")}>
            + Clinic Preset
          </Button>
          <Button onClick={() => setShowBuilder(true)}>Custom Workflow</Button>
        </div>
      </div>

      {/* Existing workflows */}
      <div className="grid gap-4">
        {dataLoading ? (
          <PageSpinner label="Loading workflows..." />
        ) : workflows.length === 0 ? (
          <p className="text-sm text-gray-400">No workflows yet — use a preset or create a custom one above.</p>
        ) : (
          workflows.map((w) => (
            <Card key={w.id}>
              <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{w.name}</p>
                  <p className="text-sm text-gray-500">
                    {w.businesses?.name} • {w.language === "hi" ? "Hindi" : "English"} •{" "}
                    {w.questions?.length || 0} questions
                  </p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      w.is_active ? "bg-green-100 text-green-700" : "bg-gray-100"
                    }`}
                  >
                    {w.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Builder */}
      {showBuilder && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>Workflow Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Business</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
              >
                <option value="">Select business</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Workflow Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium">Language</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Greeting / Opening Message</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Closing Message</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Questions to Collect</label>
                <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
                  + Add Question
                </Button>
              </div>
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-400 mt-2">{idx + 1}.</span>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Question label"
                        value={q.label}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].label = e.target.value;
                          setQuestions(updated);
                        }}
                      />
                      <div className="flex gap-2">
                        <select
                          className="h-9 rounded-md border px-2 text-sm"
                          value={q.type}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[idx].type = e.target.value as any;
                            setQuestions(updated);
                          }}
                        >
                          <option value="text">Text</option>
                          <option value="select">Select</option>
                          <option value="date">Date</option>
                          <option value="phone">Phone</option>
                          <option value="number">Number</option>
                        </select>
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].required = e.target.checked;
                              setQuestions(updated);
                            }}
                          />
                          Required
                        </label>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save Workflow"}
              </Button>
              <Button variant="outline" onClick={() => setShowBuilder(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
