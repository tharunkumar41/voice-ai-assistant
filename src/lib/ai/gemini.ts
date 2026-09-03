import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash", // or "gemini-1.5-flash"
});

// Tool definitions in Gemini format
export const calendarToolDeclarations = [
  {
    name: "check_calendar_availability",
    description:
      "Check if a specific date and time is available on the business calendar before scheduling.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: "Date in YYYY-MM-DD format",
        },
        time: {
          type: SchemaType.STRING,
          description: "Time in HH:mm 24-hour format",
        },
        duration_minutes: {
          type: SchemaType.NUMBER,
          description: "Duration in minutes (default 30)",
        },
      },
      required: ["date", "time"],
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Create a new calendar event after confirming availability and customer details.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        summary: {
          type: SchemaType.STRING,
          description: "Event title, e.g. 'Callback with Rahul - Cake Order'",
        },
        description: {
          type: SchemaType.STRING,
          description: "Detailed description including collected info",
        },
        date: {
          type: SchemaType.STRING,
          description: "YYYY-MM-DD",
        },
        time: {
          type: SchemaType.STRING,
          description: "HH:mm",
        },
        duration_minutes: {
          type: SchemaType.NUMBER,
        },
        attendee_email: {
          type: SchemaType.STRING,
        },
      },
      required: ["summary", "date", "time"],
    },
  },
  {
    name: "update_calendar_event",
    description: "Reschedule or update an existing calendar event.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        event_id: { type: SchemaType.STRING },
        date: { type: SchemaType.STRING },
        time: { type: SchemaType.STRING },
        summary: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
      },
      required: ["event_id"],
    },
  },
  {
    name: "delete_calendar_event",
    description: "Cancel / delete a calendar event.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        event_id: { type: SchemaType.STRING },
      },
      required: ["event_id"],
    },
  },
];
