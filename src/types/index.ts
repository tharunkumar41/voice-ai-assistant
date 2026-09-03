export type FieldType = "text" | "select" | "date" | "phone" | "number" | "textarea" | "boolean";

export interface WorkflowQuestion {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for select
  placeholder?: string;
}

export interface WorkflowCondition {
  id: string;
  fieldId: string;
  operator: "equals" | "contains" | "less_than_hours" | "greater_than";
  value: string | number;
  action: "set_urgent" | "set_priority" | "skip_question" | "custom";
  message?: string;
}

export interface WorkflowAction {
  id: string;
  type: "create_enquiry" | "create_appointment" | "create_lead" | "create_service_request" | "notify_owner" | "create_calendar_event";
  config?: Record<string, any>;
}

export interface Workflow {
  id: string;
  business_id: string;
  name: string;
  trigger_type: "missed_call";
  greeting: string;
  closing_message: string;
  language: "en" | "hi";
  questions: WorkflowQuestion[];
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  industry: string;
  phone?: string;
  language_pref: "en" | "hi";
  timezone: string;
  created_at?: string;
}

export type ConversationStatus = "in_progress" | "completed" | "failed";
export type FollowUpStatus = "pending" | "contacted" | "completed" | "closed";

export interface Conversation {
  id: string;
  workflow_id: string;
  business_id: string;
  caller_name?: string;
  caller_phone?: string;
  status: ConversationStatus;
  intent?: string;
  urgency: boolean;
  collected_data: Record<string, any>;
  summary?: string;
  transcript: { role: "user" | "assistant" | "system"; content: string; timestamp: string }[];
  action_taken?: string;
  follow_up_status: FollowUpStatus;
  calendar_event_id?: string;
  created_at: string;
  updated_at?: string;
  // Joined
  workflow?: Workflow;
  business?: Business;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}
