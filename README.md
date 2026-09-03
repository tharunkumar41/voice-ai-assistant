# Voice AI Personal Assistant

## Project Report and README

### 1. Project Overview

The **Voice AI Personal Assistant** is a web-based intelligent assistant designed to help businesses handle missed calls and customer enquiries automatically. The application combines voice interaction, artificial intelligence, configurable business workflows, conversation storage, and calendar integration in a single dashboard.

Instead of allowing a missed call to become a lost customer, the system can collect the caller's information, understand the caller's intent, identify urgent requests, and perform configured follow-up actions.

The project is built using **Next.js, TypeScript, Tailwind CSS, Supabase, Groq-compatible AI APIs, Deepgram/Sarvam speech services, and Google Calendar integration**.

---

### 2. Problem Statement

Small businesses frequently miss customer calls because staff may be busy, unavailable, or outside working hours. Missed calls can result in:

- Lost leads and enquiries
- Delayed customer responses
- Manual data-entry work
- Difficulty tracking follow-ups
- Missed appointments
- Poor customer experience

This project addresses these problems by providing an AI-powered assistant that can communicate with customers, collect structured information, and save the conversation for business follow-up.

---

### 3. Objectives

The main objectives of the project are:

1. Automate the handling of customer enquiries.
2. Provide voice-based and text-based interaction.
3. Allow each business to configure its own assistant workflow.
4. Collect customer details through dynamic questions.
5. Detect urgent conversations automatically.
6. Store transcripts and extracted information.
7. Support appointment scheduling through Google Calendar.
8. Provide a dashboard for businesses, workflows, conversations, and follow-ups.
9. Support English and Hindi language workflows.
10. Maintain secure, owner-specific access to business data.

---

### 4. Main Features

#### Authentication

- User sign-in and sign-out
- Protected dashboard routes
- Server-side authentication checks
- Business data restricted to the authenticated owner

#### Business Management

- Create and manage business profiles
- Store business name, industry, phone number, language preference, and timezone
- Associate workflows and conversations with a business

#### Workflow Builder

Businesses can configure:

- Assistant greeting
- Closing message
- Language
- Questions to ask callers
- Conditional rules
- Actions to execute
- Active/inactive status

Supported question types include:

- Text
- Select
- Date
- Phone
- Number
- Textarea
- Boolean

#### AI Conversation Engine

The assistant:

- Receives conversation messages
- Uses a business-specific system prompt
- Understands the caller's request
- Asks relevant questions
- Extracts structured data
- Identifies intent
- Detects urgency
- Produces a conversation summary

#### Voice Interaction

The application supports:

- Speech-to-text conversion
- Text-to-speech responses
- English and Hindi language handling
- Deepgram speech recognition
- Sarvam speech recognition and synthesis
- ElevenLabs as an alternative text-to-speech provider

The implementation uses server-side speech APIs rather than browser SpeechRecognition or browser speechSynthesis.

#### Calendar Integration

The AI can use calendar tools to:

- Check calendar availability
- Create calendar events
- Update calendar events
- Delete calendar events

The assistant can perform multiple tool rounds when a conversation requires checking availability before creating an appointment.

#### Conversation Management

Each conversation can contain:

- Caller name
- Caller phone number
- Status
- Intent
- Urgency flag
- Extracted data
- Summary
- Full transcript
- Action taken
- Follow-up status
- Calendar event ID

#### Dashboard

The dashboard contains sections for:

- Overview
- Businesses
- Conversations
- Workflows
- Voice simulator


#### Simulator — User Side

The **Simulator represents the user/customer side of the project**. It allows a person to interact with the AI assistant as if they were a customer contacting the business.

Through the simulator, the user can:

- Start a voice or text conversation
- Hear the assistant's response
- Answer the workflow questions
- Provide details such as name, phone number, and enquiry information
- Request an appointment when calendar integration is configured
- Experience the complete customer interaction flow

This makes the simulator useful for testing and demonstrating how the final AI assistant would behave from the customer's perspective. The dashboard and simulator together demonstrate both sides of the system:

```text
Business owner side                 Customer side
-------------------                 -------------
Dashboard                           Voice Simulator
    |                                   |
Configure workflows                 Start conversation
Manage businesses                   Answer questions
Review conversations                Receive AI responses
Track follow-ups                    Request appointments
```

---

### 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui-style reusable components |
| Backend | Next.js Route Handlers |
| Authentication | Supabase Auth |
| Database | PostgreSQL through Supabase |
| AI Provider | Groq-compatible OpenAI SDK client |
| Default AI Model | `openai/gpt-oss-20b` |
| Speech-to-Text | Deepgram and Sarvam |
| Text-to-Speech | Sarvam and ElevenLabs |
| Calendar | Google Calendar API |
| Validation and Types | TypeScript |
| Package Manager | npm |

---

### 6. System Architecture

```text
User
 |
 v
Next.js Web Interface
 |
 +--> Authentication and Dashboard
 |
 +--> Voice Simulator
 |       |
 |       +--> Speech-to-Text API
 |       +--> AI Chat API
 |       +--> Text-to-Speech API
 |
 +--> Workflow Configuration
 |
 v
Next.js API Routes
 |
 +--> AI Client
 |       |
 |       +--> Groq-compatible AI service
 |
 +--> Voice Services
 |       |
 |       +--> Deepgram
 |       +--> Sarvam
 |       +--> ElevenLabs
 |
 +--> Calendar Tools
 |       |
 |       +--> Google Calendar
 |
 v
Supabase
 |
 +--> Authentication
 +--> Businesses
 +--> Workflows
 +--> Conversations
```

---

### 7. Project Structure

```text
voice-ai-assistant/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   ├── tools/
│   │   │   └── voice/
│   │   │       ├── stt/
│   │   │       └── tts/
│   │   ├── auth/
│   │   │   └── signout/
│   │   ├── dashboard/
│   │   │   ├── businesses/
│   │   │   ├── conversations/
│   │   │   ├── simulator/
│   │   │   └── workflows/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── dashboard/
│   │   ├── shared/
│   │   ├── ui/
│   │   ├── voice/
│   │   └── workflow/
│   ├── lib/
│   │   ├── ai/
│   │   ├── supabase/
│   │   ├── tools/
│   │   ├── voice/
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── supabase/
│   └── schema.sql
├── .env.local
├── package.json
└── README.md
```

---

### 8. Database Design

The database contains three main tables.

#### Businesses

Stores business-level information and connects each business to its owner.

Important fields:

- `id`
- `owner_id`
- `name`
- `industry`
- `phone`
- `language_pref`
- `timezone`
- `created_at`

#### Workflows

Stores the configuration of an AI assistant for a business.

Important fields:

- `id`
- `business_id`
- `name`
- `trigger_type`
- `greeting`
- `closing_message`
- `language`
- `questions`
- `conditions`
- `actions`
- `is_active`

#### Conversations

Stores customer interactions and follow-up information.

Important fields:

- `id`
- `workflow_id`
- `business_id`
- `caller_name`
- `caller_phone`
- `status`
- `intent`
- `urgency`
- `collected_data`
- `summary`
- `transcript`
- `action_taken`
- `follow_up_status`
- `calendar_event_id`

Row Level Security policies ensure that users can manage only their own business records and related workflows and conversations.

---

### 9. Conversation Processing Flow

```text
1. Customer starts a conversation
2. The selected business workflow is loaded
3. The system verifies the authenticated user
4. The AI receives the workflow instructions and conversation history
5. The assistant asks questions and understands responses
6. Calendar tools are called when required
7. The conversation is converted into structured data
8. Intent, urgency, completion status, and summary are extracted
9. The transcript and results are saved in Supabase
10. The business can review the conversation and follow up
```

---

### 10. AI Tool-Calling Flow

The chat API supports controlled tool execution.

Allowed calendar operations are:

- `check_calendar_availability`
- `create_calendar_event`
- `update_calendar_event`
- `delete_calendar_event`

The API allows up to five tool-processing rounds. This supports workflows such as:

```text
Customer requests an appointment
        |
        v
Check calendar availability
        |
        v
Availability confirmed
        |
        v
Create calendar event
        |
        v
Return confirmation to customer
```

Tool names are validated before execution, and tool errors are returned to the AI as structured results.

---

### 11. Environment Variables

Create a `.env.local` file in the project root.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI provider (Groq – OpenAI-compatible)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
# GROQ_BASE_URL=https://api.groq.com/openai/v1

# Google Calendar

GOOGLE_CALENDAR_ID=yourgmail@gmail.com
GOOGLE_CALENDAR_TIMEZONE=Asia/Kolkata

# 1. Google Cloud Console → create Service Account → enable Calendar API
# 2. Download JSON key → put client_email + private_key below
# 3. Open https://calendar.google.com with yourgmail@gmail.com
# 4. Settings → Share with specific people → add the service-account email
#    (e.g. xxx@project.iam.gserviceaccount.com) with "Make changes to events"
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# --- Method 2: OAuth2 (uses the owner's Google account directly) ---
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GOOGLE_REFRESH_TOKEN=...

# Voice – STT / TTS (NO browser Speech APIs)
DEEPGRAM_API_KEY=your_deepgram_api_key
SARVAM_API_KEY=your_sarvam_api_key
```

Only configure the providers required for the features you want to use. For speech recognition, configure either Deepgram or Sarvam. For speech synthesis, configure Sarvam or ElevenLabs.

---

### 12. Installation and Setup

#### Step 1: Clone or extract the project

```bash
git clone <repository-url>
cd voice-ai-assistant
```

#### Step 2: Install dependencies

```bash
npm install
```

#### Step 3: Configure environment variables

Create `.env.local` and add the required credentials.

#### Step 4: Configure Supabase

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run the SQL file located at:

```text
supabase/schema.sql
```

4. Copy the Supabase URL and anonymous key into `.env.local`.

#### Step 5: Start the development server

```bash
npm run dev
```

#### Step 6: Open the application

Visit:

```text
http://localhost:3000
```

---

### 13. Available Scripts

```bash
npm run dev
```

Starts the development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Starts the production server after building.

```bash
npm run lint
```

Runs the project's linting checks.

---

### 14. Security Considerations

The project includes several security mechanisms:

- Authentication is checked on protected API requests.
- Business ownership is verified before accessing workflows or conversations.
- Supabase Row Level Security is enabled.
- API keys are stored in environment variables.
- Calendar tool names are validated before execution.
- User-specific business data is separated using owner and business relationships.

API keys should never be committed to the repository or exposed in frontend code.

---

### 15. Testing and Verification

The following areas should be tested before deployment:

#### Authentication

- User can sign in.
- User can sign out.
- Protected pages redirect unauthenticated users.
- A user cannot access another user's business data.

#### Business and Workflow Management

- Business creation works.
- Workflow creation and editing work.
- Questions, conditions, and actions are saved correctly.
- Inactive workflows do not process new requests.

#### AI Chat

- The assistant responds to text messages.
- The assistant follows workflow questions.
- Structured data is extracted correctly.
- Invalid tool calls are rejected.
- Tool failures are handled gracefully.

#### Voice

- Audio can be recorded and submitted.
- Speech-to-text returns a transcript.
- Text-to-speech returns playable audio.
- English and Hindi configurations work when the required provider keys are available.

#### Calendar

- Availability can be checked.
- Events can be created, updated, and deleted.
- Calendar errors are shown without crashing the conversation.

#### Database

- Conversations are saved.
- Transcripts are preserved.
- Urgent conversations are marked correctly.
- Follow-up status can be updated.

---

### 16. Advantages

- Reduces the impact of missed calls.
- Saves time spent on repetitive enquiries.
- Provides consistent customer interaction.
- Supports configurable workflows for different industries.
- Combines voice, AI, database, and calendar functionality.
- Provides structured data instead of only unorganized chat messages.
- Supports multilingual interaction.
- Enables businesses to review conversations and follow up later.

---

### 17. Limitations

- The system depends on external AI and speech service availability.
- API usage may create service costs.
- Speech accuracy can vary depending on audio quality and language.
- Google Calendar requires correct OAuth configuration.
- The current workflow trigger is primarily designed around missed-call scenarios.
- Production deployment requires careful configuration of authentication redirects, environment variables, and database policies.

---

### 18. Future Enhancements

Possible future improvements include:

1. Real phone-number integration for automatic missed-call detection.
2. WhatsApp and SMS follow-up support.
3. More Indian language options.
4. Advanced analytics and business performance reports.
5. Email and notification integrations.
6. More workflow triggers, such as website forms and incoming messages.
7. Role-based access for business teams.
8. Automatic lead scoring.
9. Improved conversation search and filtering.
10. Human handoff to a live agent.
11. Automated reminders for pending follow-ups.
12. Deployment monitoring and usage-cost dashboards.

---

### 19. Expected Outcome

The expected outcome of this project is a reliable AI assistant platform that helps businesses respond to customers more quickly, collect useful information automatically, schedule appointments, and manage follow-ups from a centralized dashboard.

The system demonstrates how modern web technologies and AI services can be combined to create a practical business automation product.

---

### 20. Conclusion

The Voice AI Personal Assistant project provides a complete foundation for intelligent customer communication. It combines a configurable workflow engine with AI conversation processing, voice services, secure database storage, and calendar automation.

By automating repetitive customer interactions and preserving structured conversation data, the application can improve response time, reduce missed opportunities, and help businesses provide a better customer experience.

---

## Author

**Project:** Voice AI Personal Assistant  
**Category:** AI-powered business automation  
**Frontend:** Next.js and TypeScript  
**Backend:** Next.js API routes  
**Database:** Supabase PostgreSQL  
**AI:** Groq-compatible AI API  
**Voice:** Deepgram, Sarvam, and ElevenLabs  
**Integration:** Google Calendar
