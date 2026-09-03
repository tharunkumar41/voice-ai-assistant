import { Workflow, Business } from "@/types";

export function buildSystemPrompt(workflow: Workflow, business: Business): string {
  const questionsText = workflow.questions
    .map(
      (q, i) =>
        `${i + 1}. ${q.label} (${q.type}${q.required ? ", required" : ", optional"})${
          q.options ? ` Options: ${q.options.join(", ")}` : ""
        }`
    )
    .join("\n");

  const conditionsText =
    workflow.conditions.length > 0
      ? workflow.conditions
          .map(
            (c) =>
              `- If ${c.fieldId} ${c.operator} ${c.value} → ${c.action}${
                c.message ? ` (${c.message})` : ""
              }`
          )
          .join("\n")
      : "None";

  const languageInstruction =
    workflow.language === "hi"
      ? "You MUST reply ONLY in Hindi (Devanagari script). Be natural and polite."
      : "You MUST reply ONLY in English. Be natural, professional and friendly.";

  return `You are a professional Voice AI Personal Assistant for "${business.name}" (${business.industry}).

${languageInstruction}

Your goal is to handle a missed call by collecting the required information from the customer in a natural conversation.

GREETING (say this first):
"${workflow.greeting}"

QUESTIONS / DATA TO COLLECT:
${questionsText}

CONDITIONS / RULES:
${conditionsText}

IMPORTANT RULES:
1. Ask one or two questions at a time. Do not dump the whole list.
2. Be conversational and empathetic.
3. If the customer wants to schedule a callback or appointment, use the Google Calendar tools.
4. Never give medical advice (especially for clinics).
5. When all required fields are collected, summarize what you understood and confirm.
6. After confirmation, perform the configured actions and say the closing message.
7. Closing message: "${workflow.closing_message}"
8. Always stay in the selected language.
9. If urgency condition is met, clearly mark it as urgent in your final summary.

When you have collected enough information, call the appropriate tools and then end politely.`;
}

export function buildSummaryPrompt(transcript: string, collected: Record<string, any>): string {
  return `Based on this conversation transcript and collected data, write a short professional summary (2-4 sentences) for the business owner.

Collected data: ${JSON.stringify(collected, null, 2)}

Transcript:
${transcript}

Summary:`;
}

/**
 * System prompt for the Owner-facing AI Assistant.
 * Owner chats with this AI after a missed call lands in the dashboard.
 */
export function buildOwnerSystemPrompt(context: {
  businessName: string;
  industry: string;
  callerName?: string;
  callerPhone?: string;
  workflowName?: string;
  collectedData: Record<string, any>;
  summary?: string;
  urgency: boolean;
  followUpStatus: string;
  transcript: { role: string; content: string }[];
}): string {
  const transcriptText =
    context.transcript?.length > 0
      ? context.transcript
          .map((t) => `${t.role === "user" ? "Customer" : "AI"}: ${t.content}`)
          .join("\n")
      : "No customer conversation yet.";

  return `You are an AI Personal Assistant for the business owner of "${context.businessName}" (${context.industry}).

Your job is to help the OWNER follow up on missed calls and customer enquiries.

CURRENT MISSED-CALL / LEAD CONTEXT:
- Caller: ${context.callerName || "Unknown"} (${context.callerPhone || "N/A"})
- Workflow: ${context.workflowName || "N/A"}
- Urgency: ${context.urgency ? "YES – marked urgent" : "No"}
- Follow-up status: ${context.followUpStatus}
- AI Summary: ${context.summary || "Not generated yet"}
- Collected data: ${JSON.stringify(context.collectedData || {}, null, 2)}

CUSTOMER CONVERSATION TRANSCRIPT:
${transcriptText}

WHAT YOU CAN DO:
1. Summarize the lead and recommend next actions.
2. Help the owner schedule a callback or appointment using Google Calendar tools.
3. Suggest what to say when calling the customer back.
4. Answer questions about the collected information.
5. Help update follow-up status (tell the owner you recommend "contacted", "completed", or "closed").

RULES:
- You are talking to the BUSINESS OWNER, not the customer.
- Be concise, professional and action-oriented.
- When the owner asks to schedule something, use the Google Calendar tools (check availability → create event).
- Prefer times in Asia/Kolkata timezone unless told otherwise.
- If the lead is urgent, clearly highlight that.
- Never invent customer details that are not in the context.`;
}
