import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { AI_MODEL, getAIClient } from "@/lib/ai/client";
import {
  calendarTools,
  executeCalendarTool,
} from "@/lib/tools/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { Workflow, Business, ChatMessage } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      workflowId,
      conversationId,
      businessId,
    }: {
      messages: ChatMessage[];
      workflowId: string;
      conversationId?: string;
      businessId: string;
    } = body;

    if (!Array.isArray(messages) || !workflowId || !businessId) {
      return NextResponse.json(
        { error: "messages, workflowId and businessId are required" },
        { status: 400 }
      );
    }

    const ai = getAIClient();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: workflow } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("business_id", businessId)
      .single();

    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .single();

    if (!workflow || !business) {
      console.error("Chat authorization failed:", {
        userId: user.id,
        workflowId,
        businessId,
        workflowFound: !!workflow,
        businessFound: !!business,
      });

      return NextResponse.json(
        {
          error: "Workflow or business not found",
          workflowFound: !!workflow,
          businessFound: !!business,
        },
        { status: 404 }
      );
    }

    const currentDateTime = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "short",
      hour12: true,
    }).format(new Date());

    const systemPrompt = `${buildSystemPrompt(
      workflow as Workflow,
      business as Business
    )}

CURRENT DATE AND TIME:
${currentDateTime} (Asia/Kolkata)

CALENDAR RULES:
- Interpret relative dates such as today, tomorrow, and next Monday using the current date above.
- Never check or create an appointment in the past.
- If the requested date or time has already passed, explain that it is in the past and ask for a future date and time.
- Do not claim a slot is available unless the calendar tool successfully confirms it.
`;

    const openaiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    let assistantMessage: any = null;
    let calendarEventId: string | null = null;
    const toolCallsUsed: any[] = [];

    /*
     * Keep tools enabled for every round.
     *
     * Example:
     * Round 1: check availability
     * Round 2: create event
     * Round 3: final confirmation
     *
     * The loop stops when the AI returns a normal text response.
     */
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let response;
      try {
        response = await ai.chat.completions.create({
          model: AI_MODEL,
          messages: openaiMessages,
          tools: calendarTools,
          tool_choice: "auto",
          temperature: 0.6,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Chat API error:", error);
        if (/tool call validation failed/i.test(errorMessage) && /check_calendar_availability/i.test(errorMessage) && /date|time/i.test(errorMessage)) {
          assistantMessage = {
            role: "assistant",
            content: "Sure! What date and time would you like to book?",
            tool_calls: [],
          };
          break;
        }
        throw error;
      }

      const firstChoice = response?.choices?.[0];
      if (!firstChoice?.message) {
        console.error("Chat API returned an empty response:", response);
        assistantMessage = {
          role: "assistant",
          content: "I'm sorry, I couldn't process that. Could you please try again?",
          tool_calls: [],
        };
        break;
      }

      assistantMessage = firstChoice.message;
      const rawToolCalls = assistantMessage.tool_calls;

      if (!rawToolCalls || rawToolCalls.length === 0) {
        break;
      }

      const allowedTools = new Set([
        "check_calendar_availability",
        "create_calendar_event",
        "update_calendar_event",
        "delete_calendar_event",
      ]);

      const sanitizedToolCalls = rawToolCalls
        .map((toolCall: any) => {
          const rawName = toolCall.function?.name || "";
          const fnName = rawName.split("<")[0].trim();

          console.log("AI tool call:", { rawName, fnName });

          if (!allowedTools.has(fnName)) {
            console.error("Invalid tool name from AI:", rawName);
            return null;
          }

          return {
            ...toolCall,
            function: {
              ...toolCall.function,
              name: fnName,
            },
          };
        })
        .filter((toolCall: any): toolCall is any => toolCall !== null);

      if (sanitizedToolCalls.length === 0) {
        break;
      }

      toolCallsUsed.push(...sanitizedToolCalls);

      /*
       * Add the assistant tool-call message exactly as returned,
       * but with cleaned function names.
       */
      openaiMessages.push({
        role: "assistant",
        content: assistantMessage.content || null,
        tool_calls: sanitizedToolCalls,
      });

      for (const toolCall of sanitizedToolCalls) {
        const functionName = toolCall.function.name;
        let args: Record<string, any> = {};

        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          openaiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error: "Invalid tool arguments",
            }),
          });
          continue;
        }

        let toolResult: string;

        try {
          toolResult = await executeCalendarTool(functionName, args);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Calendar tool execution failed";

          console.error("Calendar tool execution error:", error);

          toolResult = JSON.stringify({
            success: false,
            error: errorMessage,
          });
        }

        try {
          const parsed = JSON.parse(toolResult);

          if (
            functionName === "create_calendar_event" &&
            parsed.eventId
          ) {
            calendarEventId = parsed.eventId;
          }
        } catch {
          console.error("Calendar tool returned invalid JSON");
        }

        openaiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      /*
       * Do NOT call the AI with tool_choice: "none" here.
       *
       * The next loop round must still allow another tool call,
       * such as create_calendar_event after availability checking.
       */
    }

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "AI did not return a response" },
        { status: 500 }
      );
    }

    const reply =
      assistantMessage.content ||
      "I'm sorry, I couldn't process that. Could you please repeat?";

    // Extract structured data
    let collectedData: Record<string, any> = {};
    let urgency = false;
    let isComplete = false;
    let summary = "";
    let intent = "";

    try {
      const extraction = await ai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: `Extract data from the conversation. Return ONLY valid JSON with this structure:
{
  "collected_data": {},
  "intent": "",
  "urgency": false,
  "is_complete": false,
  "summary": ""
}

Fields to collect: ${JSON.stringify((workflow as Workflow).questions)}
Urgency conditions: ${JSON.stringify((workflow as Workflow).conditions)}`,
          },
          {
            role: "user",
            content:
              messages
                .map((message) => `${message.role}: ${message.content}`)
                .join("\n") + `\nassistant: ${reply}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const extracted = JSON.parse(
        extraction.choices[0].message.content || "{}"
      );

      collectedData = extracted.collected_data || {};
      urgency = !!extracted.urgency;
      isComplete = !!extracted.is_complete;
      summary = extracted.summary || "";
      intent = extracted.intent || "";
    } catch (error) {
      console.error("Extraction error:", error);
    }

    // Save to DB
    if (conversationId) {
      const timestamp = new Date().toISOString();

      const fullTranscript = [
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
          timestamp,
        })),
        {
          role: "assistant",
          content: reply,
          timestamp,
        },
      ];

      const updatePayload: Record<string, any> = {
        transcript: fullTranscript,
        collected_data: collectedData,
        urgency,
        intent,
        updated_at: timestamp,
      };

      if (summary) updatePayload.summary = summary;

      if (calendarEventId) {
        updatePayload.calendar_event_id = calendarEventId;
      }

      if (isComplete) {
        updatePayload.status = "completed";
        updatePayload.action_taken = calendarEventId
          ? "Calendar event created + enquiry recorded"
          : "Enquiry recorded";
      }

      const { error: updateError } = await supabase
        .from("conversations")
        .update(updatePayload)
        .eq("id", conversationId)
        .eq("business_id", businessId);

      if (updateError) {
        console.error("Conversation update error:", updateError);
      }
    }

    return NextResponse.json({
      reply,
      tool_calls: toolCallsUsed.length > 0 ? toolCallsUsed : null,
      collected_data: collectedData,
      urgency,
      is_complete: isComplete,
      summary,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);

    return NextResponse.json({
      reply: "Sorry, something went wrong while processing your request. Please try again.",
      tool_calls: null,
      collected_data: {},
      urgency: false,
      is_complete: false,
      summary: "",
      error: "Request processing failed",
    });
  }
}