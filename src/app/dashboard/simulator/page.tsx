"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { VoiceMic, speakText } from "@/components/voice/VoiceMic";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function SimulatorPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [callerName, setCallerName] = useState("Rahul Sharma");
  const [callerPhone, setCallerPhone] = useState("+919876543210");
  const [status, setStatus] = useState<"idle" | "ringing" | "missed" | "active">("idle");
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const [urgency, setUrgency] = useState(false);
  const [summary, setSummary] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceError, setVoiceError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const selectedWf = workflows.find((w) => w.id === selectedWorkflow);
  const language: "en" | "hi" = selectedWf?.language === "hi" ? "hi" : "en";

  async function loadWorkflows() {
    const { data } = await supabase
      .from("workflows")
      .select("*, businesses(id, name)")
      .eq("is_active", true);
    setWorkflows(data || []);
    if (data && data.length > 0) setSelectedWorkflow(data[0].id);
  }

  async function playReply(text: string) {
    if (!voiceEnabled || !text) return;
    setSpeaking(true);
    try {
      await speakText(text, language);
    } catch (err: any) {
      console.error("TTS error:", err);
      setVoiceError(err.message || "Could not play voice reply");
    } finally {
      setSpeaking(false);
    }
  }

  async function simulateMissedCall() {
    if (!selectedWorkflow || loading) return;

    const wf = workflows.find((w) => w.id === selectedWorkflow);
    if (!wf) return;

    setStatus("ringing");
    setMessages([]);
    setCollectedData({});
    setUrgency(false);
    setSummary("");
    setConversationId(null);
    setVoiceError("");

    await new Promise((r) => setTimeout(r, 1200));
    setStatus("missed");

    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        workflow_id: selectedWorkflow,
        business_id: wf.business_id || wf.businesses?.id,
        caller_name: callerName,
        caller_phone: callerPhone,
        status: "in_progress",
        transcript: [],
        collected_data: {},
        follow_up_status: "pending",
        intent: "missed_call",
      })
      .select()
      .single();

    if (error) {
      alert("Error creating conversation: " + error.message);
      setStatus("idle");
      return;
    }

    setConversationId(conv.id);
    setStatus("active");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `[SYSTEM] Missed call received from ${callerName} (${callerPhone}). Start the conversation with the configured greeting and begin collecting information.`,
            },
          ],
          workflowId: selectedWorkflow,
          conversationId: conv.id,
          businessId: wf.business_id || wf.businesses?.id,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages([{ role: "assistant", content: data.reply }]);
        // Speak the greeting
        playReply(data.reply);
      }
      if (data.collected_data) setCollectedData(data.collected_data);
      if (data.urgency) setUrgency(true);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function sendUserText(text: string) {
    if (!text.trim() || !selectedWorkflow || loading || !conversationId) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setVoiceError("");

    const wf = workflows.find((w) => w.id === selectedWorkflow);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          workflowId: selectedWorkflow,
          conversationId,
          businessId: wf?.business_id || wf?.businesses?.id,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
        playReply(data.reply);
      } else if (data.error) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "Error: " + data.error },
        ]);
      }

      if (data.collected_data) setCollectedData(data.collected_data);
      if (typeof data.urgency === "boolean") setUrgency(data.urgency);
      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Network error: " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function sendMessage() {
    sendUserText(input);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Missed Call Simulator</h1>
        <p className="text-gray-600 text-sm mt-1">
          Pure simulation of a missed-call trigger with{" "}
          <strong>real voice</strong> (Deepgram/Sarvam STT + Sarvam/ElevenLabs TTS).
          No browser Speech APIs.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">How it works</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-800">
          <li>Select a workflow and enter caller details</li>
          <li>Click <strong>Simulate Missed Call</strong> — AI greets you (spoken if voice is on)</li>
          <li>
            Reply by typing <strong>or hold 🎤 to talk</strong>
          </li>
          <li>AI replies in text + voice; data is saved to the dashboard</li>
        </ol>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Configure Incoming Call</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Active Workflow</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                disabled={status === "active" || loading}
              >
                {workflows.length === 0 && (
                  <option value="">No workflows found – create one first</option>
                )}
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.businesses?.name || "Business"})
                    {w.language === "hi" ? " · Hindi" : " · English"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Caller Name</label>
              <Input
                className="mt-1"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                disabled={status === "active" || loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Caller Phone</label>
              <Input
                className="mt-1"
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
                disabled={status === "active" || loading}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {status === "idle" && (
              <Button
                onClick={simulateMissedCall}
                disabled={!selectedWorkflow || loading}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Simulate Missed Call
              </Button>
            )}

            {status === "ringing" && (
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-sm font-medium text-yellow-700">
                  Incoming call from {callerPhone}...
                </span>
              </div>
            )}

            {status === "missed" && (
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-700">
                  Call missed. Creating conversation...
                </span>
              </div>
            )}

            {status === "active" && (
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Conversation Active
                </Badge>
                {speaking && (
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                    🔊 Speaking...
                  </Badge>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(e.target.checked)}
                  />
                  Voice replies
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatus("idle");
                    setConversationId(null);
                    setMessages([]);
                    setCollectedData({});
                    setUrgency(false);
                    setSummary("");
                  }}
                >
                  End & Start New
                </Button>
                {conversationId && (
                  <Link
                    href="/dashboard/conversations"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View in Dashboard →
                  </Link>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {status === "active" && conversationId && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 h-[520px] flex flex-col">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Live Conversation
                  {selectedWf && (
                    <span className="font-normal text-gray-500 text-sm ml-2">
                      · {selectedWf.name}
                    </span>
                  )}
                </CardTitle>
                {urgency && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                    Urgent
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto py-4 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-500">
                    AI is thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </CardContent>

            <div className="p-4 border-t space-y-2">
              {voiceError && (
                <p className="text-xs text-red-600">{voiceError}</p>
              )}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type or use the mic..."
                  disabled={loading || speaking}
                />
                <VoiceMic
                  language={language}
                  disabled={loading || speaking}
                  onTranscript={(text) => sendUserText(text)}
                  onError={(msg) => setVoiceError(msg)}
                />
                <Button onClick={sendMessage} disabled={loading || !input.trim() || speaking}>
                  Send
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Hold the mic button and speak · STT: Deepgram / Sarvam · TTS: Sarvam / ElevenLabs
              </p>
            </div>
          </Card>

          <Card className="h-[520px] flex flex-col">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-base">Collected Data</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto py-4 space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Caller</p>
                <p className="font-medium">{callerName}</p>
                <p className="text-gray-600">{callerPhone}</p>
              </div>

              {Object.keys(collectedData).length > 0 ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Extracted Fields</p>
                  <div className="space-y-2">
                    {Object.entries(collectedData).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded-md px-3 py-2">
                        <p className="text-xs text-gray-500 capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="font-medium break-words">{String(value || "—")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Data will appear here as the AI collects information...
                </p>
              )}

              {summary && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">AI Summary</p>
                  <p className="text-sm bg-blue-50 rounded-md p-3">{summary}</p>
                </div>
              )}

              {urgency && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
                  Marked as <strong>Urgent</strong> based on workflow conditions
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
