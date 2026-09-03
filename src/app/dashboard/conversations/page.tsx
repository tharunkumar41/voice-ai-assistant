"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    setLoading(true);

    const { data } = await supabase
      .from("conversations")
      .select("*, workflows(name), businesses(name)")
      .order("created_at", { ascending: false });

    setConversations(data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase
      .from("conversations")
      .update({
        follow_up_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    await loadConversations();

    if (selected?.id === id) {
      setSelected({
        ...selected,
        follow_up_status: status,
      });
    }
  }

  function selectConversation(conversation: any) {
    setSelected(conversation);
  }

  const pendingCount = conversations.filter(
    (conversation) => conversation.follow_up_status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Conversations</h1>

          <p className="text-sm text-gray-500 mt-1">
            Missed calls and customer conversations are displayed here.
          </p>
        </div>

        {pendingCount > 0 && (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto">
          {loading && <p className="text-gray-500">Loading...</p>}

          {!loading && conversations.length === 0 && (
            <p className="text-gray-500 text-sm">
              No conversations yet. Use the Simulator to create a missed call.
            </p>
          )}

          {conversations.map((conversation) => (
            <Card
              key={conversation.id}
              className={`cursor-pointer transition hover:border-blue-300 ${
                selected?.id === conversation.id
                  ? "border-blue-500 bg-blue-50"
                  : ""
              }`}
              onClick={() => selectConversation(conversation)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {conversation.caller_name || "Unknown"}
                    </p>

                    <p className="text-xs text-gray-500">
                      {conversation.caller_phone}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      {conversation.workflows?.name || "—"}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        conversation.follow_up_status === "pending"
                          ? "bg-orange-100 text-orange-700"
                          : conversation.follow_up_status === "completed"
                          ? "bg-green-100 text-green-700"
                          : conversation.follow_up_status === "contacted"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {conversation.follow_up_status}
                    </span>

                    {conversation.urgency && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        URGENT
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  {new Date(conversation.created_at).toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Conversation Details */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card className="min-h-[520px] flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    {selected.caller_name || "Unknown"} •{" "}
                    {selected.caller_phone}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                <div className="p-6 space-y-4 overflow-y-auto max-h-[480px]">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateStatus(selected.id, "contacted")
                      }
                    >
                      Mark Contacted
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateStatus(selected.id, "completed")
                      }
                    >
                      Completed
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => updateStatus(selected.id, "closed")}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Business</p>
                      <p className="font-medium">
                        {selected.businesses?.name || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Workflow</p>
                      <p className="font-medium">
                        {selected.workflows?.name || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium">
                        {selected.status || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Follow-up</p>
                      <p className="font-medium">
                        {selected.follow_up_status || "—"}
                      </p>
                    </div>

                    {selected.urgency && (
                      <div>
                        <p className="text-gray-500">Priority</p>
                        <p className="font-medium text-red-600">
                          URGENT
                        </p>
                      </div>
                    )}

                    {selected.calendar_event_id && (
                      <div>
                        <p className="text-gray-500">Calendar Event</p>
                        <p className="font-medium text-green-700 text-xs">
                          {selected.calendar_event_id}
                        </p>
                      </div>
                    )}
                  </div>

                  {selected.summary && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        AI Summary
                      </p>

                      <p className="bg-blue-50 p-3 rounded-lg text-sm">
                        {selected.summary}
                      </p>
                    </div>
                  )}

                  {selected.collected_data &&
                    Object.keys(selected.collected_data).length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          Collected Data
                        </p>

                        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                          {Object.entries(selected.collected_data).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex gap-2"
                              >
                                <span className="text-gray-500 capitalize min-w-[120px]">
                                  {key.replace(/_/g, " ")}:
                                </span>

                                <span className="font-medium">
                                  {String(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  <div>
                    <p className="text-sm text-gray-500 mb-2">
                      Customer Transcript
                    </p>

                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                      {(selected.transcript || []).map(
                        (transcriptItem: any, index: number) => (
                          <div
                            key={index}
                            className={`text-sm ${
                              transcriptItem.role === "user"
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            <span
                              className={`inline-block px-3 py-1.5 rounded-lg max-w-[85%] ${
                                transcriptItem.role === "user"
                                  ? "bg-blue-100"
                                  : "bg-gray-100"
                              }`}
                            >
                              {transcriptItem.content}
                            </span>
                          </div>
                        )
                      )}

                      {(!selected.transcript ||
                        selected.transcript.length === 0) && (
                        <p className="text-gray-400 text-sm">
                          No transcript yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center text-gray-500">
                <p className="mb-2">
                  Select a conversation to view details
                </p>

                <p className="text-sm">
                  Select a conversation from the list to view its details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}