import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function getCalendarConfig() {
  // Default to the assignment owner's Gmail calendar when env is not set.
  // Override in .env.local with GOOGLE_CALENDAR_ID=vk7695020@gmail.com
  const calendarId =
    process.env.GOOGLE_CALENDAR_ID || "vk7695020@gmail.com";
  const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Kolkata";

  return { calendarId, timeZone };
}

function getAuth() {
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: SCOPES,
    });
  }

  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  ) {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    return client;
  }

  throw new Error(
    "Google Calendar credentials are missing. Configure either service-account credentials or OAuth2 refresh-token credentials."
  );
}

function parseDateTime(date: string, time: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Invalid time. Use HH:mm.");
  }

  // The project currently uses Asia/Kolkata. Keep the wall-clock
  // appointment time in that timezone when converting to an ISO value.
  const offset = timeZone === "Asia/Kolkata" ? "+05:30" : "Z";
  const value = new Date(`${date}T${time}:00${offset}`);

  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid date or time.");
  }

  return {
    dateTime: value.toISOString(),
    timeZone,
  };
}

function getCalendar() {
  return google.calendar({
    version: "v3",
    auth: getAuth(),
  });
}

export async function checkAvailability(
  date: string,
  time: string,
  durationMinutes = 30
) {
  try {
    const { calendarId, timeZone } = getCalendarConfig();
    const start = parseDateTime(date, time, timeZone);
    const endDate = new Date(
      new Date(start.dateTime).getTime() + durationMinutes * 60_000
    );

    const response = await getCalendar().freebusy.query({
      requestBody: {
        timeMin: start.dateTime,
        timeMax: endDate.toISOString(),
        timeZone,
        items: [{ id: calendarId }],
      },
    });

    const busy = response.data.calendars?.[calendarId]?.busy || [];
    const available = busy.length === 0;

    return {
      success: true,
      available,
      date,
      time,
      durationMinutes,
      message: available
        ? `The slot on ${date} at ${time} is available.`
        : `The slot on ${date} at ${time} is busy. Please choose another time.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown calendar error";

    return {
      success: false,
      available: false,
      message: `Could not check calendar: ${message}`,
    };
  }
}

export async function createCalendarEvent(params: {
  summary: string;
  description?: string;
  date: string;
  time: string;
  durationMinutes?: number;
  attendeeEmail?: string;
}) {
  try {
    const { calendarId, timeZone } = getCalendarConfig();
    const duration = params.durationMinutes || 30;
    const start = parseDateTime(params.date, params.time, timeZone);
    const end = new Date(
      new Date(start.dateTime).getTime() + duration * 60_000
    );

    const response = await getCalendar().events.insert({
      calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description || "",
        start,
        end: {
          dateTime: end.toISOString(),
          timeZone,
        },
        ...(params.attendeeEmail
          ? { attendees: [{ email: params.attendeeEmail }] }
          : {}),
      },
    });

    return {
      success: true,
      eventId: response.data.id || null,
      htmlLink: response.data.htmlLink || null,
      message: `Event created successfully: ${response.data.summary || params.summary}`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown calendar error";

    return {
      success: false,
      message: `Failed to create event: ${message}`,
    };
  }
}

export async function updateCalendarEvent(
  eventId: string,
  updates: {
    date?: string;
    time?: string;
    summary?: string;
    description?: string;
  }
) {
  try {
    const { calendarId, timeZone } = getCalendarConfig();
    const calendar = getCalendar();
    const existing = await calendar.events.get({
      calendarId,
      eventId,
    });

    const event = existing.data;

    if (updates.summary) event.summary = updates.summary;
    if (updates.description) event.description = updates.description;

    if (updates.date && updates.time) {
      const start = parseDateTime(updates.date, updates.time, timeZone);
      const duration =
        event.start?.dateTime && event.end?.dateTime
          ? new Date(event.end.dateTime).getTime() -
            new Date(event.start.dateTime).getTime()
          : 30 * 60_000;

      event.start = start;
      event.end = {
        dateTime: new Date(
          new Date(start.dateTime).getTime() + duration
        ).toISOString(),
        timeZone,
      };
    }

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event,
    });

    return {
      success: true,
      eventId: response.data.id || eventId,
      message: "Event updated successfully.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown calendar error";

    return {
      success: false,
      message: `Update failed: ${message}`,
    };
  }
}

export async function deleteCalendarEvent(eventId: string) {
  try {
    const { calendarId } = getCalendarConfig();

    await getCalendar().events.delete({
      calendarId,
      eventId,
    });

    return {
      success: true,
      message: "Event cancelled successfully.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown calendar error";

    return {
      success: false,
      message: `Delete failed: ${message}`,
    };
  }
}

export const calendarTools = [
  {
    type: "function" as const,
    function: {
      name: "check_calendar_availability",
      description:
        "Check whether a specific date and time is available on the business calendar.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format." },
          time: { type: "string", description: "Time in HH:mm format." },
          duration_minutes: { type: "number", description: "Duration in minutes." },
        },
        required: ["date", "time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_calendar_event",
      description:
        "Create a calendar event after the customer has confirmed the appointment details.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          description: { type: "string" },
          date: { type: "string", description: "Date in YYYY-MM-DD format." },
          time: { type: "string", description: "Time in HH:mm format." },
          duration_minutes: { type: "number" },
          attendee_email: { type: "string" },
        },
        required: ["summary", "date", "time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_calendar_event",
      description: "Reschedule or update an existing calendar event.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string" },
          date: { type: "string" },
          time: { type: "string" },
          summary: { type: "string" },
          description: { type: "string" },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_calendar_event",
      description: "Cancel an existing calendar event.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string" },
        },
        required: ["event_id"],
      },
    },
  },
];

export async function executeCalendarTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  try {
    switch (name) {
      case "check_calendar_availability":
        return JSON.stringify(
          await checkAvailability(
            args.date,
            args.time,
            args.duration_minutes || 30
          )
        );

      case "create_calendar_event":
        return JSON.stringify(
          await createCalendarEvent({
            summary: args.summary,
            description: args.description,
            date: args.date,
            time: args.time,
            durationMinutes: args.duration_minutes,
            attendeeEmail: args.attendee_email,
          })
        );

      case "update_calendar_event":
        return JSON.stringify(
          await updateCalendarEvent(args.event_id, {
            date: args.date,
            time: args.time,
            summary: args.summary,
            description: args.description,
          })
        );

      case "delete_calendar_event":
        return JSON.stringify(await deleteCalendarEvent(args.event_id));

      default:
        return JSON.stringify({
          success: false,
          error: `Unknown calendar tool: ${name}`,
        });
    }
  } catch (error: unknown) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Calendar tool failed",
    });
  }
}
