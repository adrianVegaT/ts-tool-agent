# AI Agent with Tool Use

A Next.js 16 AI agent that demonstrates the tool use pattern with the Anthropic API.
The agent can query a real PostgreSQL database and search the web to answer questions
in natural language. Built as Week 4 of a 12-month roadmap transitioning from
Laravel/PHP to AI engineering.

## What it does

- Accepts natural language questions via a chat interface
- Decides autonomously whether to use a tool or answer directly
- Queries the user's message history from Supabase when asked about chat data
- Searches the web for current information when needed
- Shows which tool was used and with what parameters for each response
- Requires authentication before accessing the agent

## How tool use works
```
User asks a question
        ↓
Claude decides if a tool is needed
        ↓
   [needs tool]              [no tool needed]
        ↓                           ↓
Claude requests tool          Claude responds
with parameters               directly
        ↓
You execute the function
        ↓
Return result to Claude
        ↓
Claude responds in
natural language
```

## Available tools

- **query_messages** — queries the authenticated user's message history from
  Supabase. Supports filtering by time period (today, week, month, all) and keyword.
- **search_web** — searches the web via DuckDuckGo for current information on any topic.

## Example questions
```
# Uses query_messages
"How many messages did I send this week?"
"What topics did I ask about this month?"
"How many tokens did I consume today?"

# Uses search_web
"Search for the latest Next.js news"
"What is tool use in AI models?"

# No tool needed
"What is a Server Component?"
"Explain what RAG means"
```

## Tech stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth)
- Anthropic SDK (`@anthropic-ai/sdk`)
- react-markdown
- @tailwindcss/typography

## Model

Currently using `claude-haiku-4-5-20251001` — configurable in `app/_actions/agent.ts`

## Setup

1. Clone the repository
2. Install dependencies
```bash
npm install
```

3. Create a Supabase project at `supabase.com` with a `messages` table:
```sql
CREATE TABLE messages (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    question        text NOT NULL,
    response        text NOT NULL,
    input_tokens    int NOT NULL DEFAULT 0,
    output_tokens   int NOT NULL DEFAULT 0,
    model           text NOT NULL,
    created_at      timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own messages"
ON messages FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

4. Create a `.env.local` file in the root folder
```bash
ANTHROPIC_API_KEY=your_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

5. Run the development server
```bash
npm run dev
```

6. Open `http://localhost:3000`

## Project structure
```
app/
├── auth/
│   ├── login/
│   │   └── page.tsx            Login page
│   ├── register/
│   │   └── page.tsx            Register page
│   └── logout/
│       └── route.ts            Logout route handler
├── _actions/
│   └── agent.ts                Server Action — tool use cycle and Anthropic calls
├── _components/
│   ├── AgentBox.tsx            Client Component — agent UI and tool display
│   ├── LoginForm.tsx           Client Component — login form
│   └── RegisterForm.tsx        Client Component — register form
├── globals.css                 Global styles and Tailwind configuration
├── layout.tsx                  Root layout
└── page.tsx                    Home page — protected
lib/
└── supabase/
    ├── client.ts               Supabase browser client
    └── server.ts               Supabase server client
proxy.ts                        Session refresh on every request
.env.example                    Environment variables template
```

## Context

Built as Week 4 of a 12-month roadmap transitioning from Laravel/PHP to AI
engineering — covering TypeScript, Next.js, RAG systems, and AI agents for
the international market.