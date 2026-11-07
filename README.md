# misaiagent — ask a university department's database a question in plain English

A small, fast question-answering layer over a department's MIS data: teachers, programs, courses and departments. Instead of a search form with six dropdowns, you type *"who teaches database systems this term?"* and get an answer grounded in the actual rows.

`React` · `Vite` · `PWA` · `Supabase (Postgres)` · `Groq LLM` · `Deno edge functions`

🌐 Live demo: https://misaiagent.vercel.app

---

## The problem

Departmental information lives in a spreadsheet-shaped table that only the person who built it can query. Students ask the same twenty questions every term, and every one of those questions is a filter over four small tables.

## How it works

1. The app fetches the department's `teachers`, `programs`, `courses` and `departments` rows from Supabase.
2. The whole (deliberately small) context — roughly 28 teachers and a handful of programs — is passed to the LLM with the user's question.
3. The model answers **from those rows only**, in Markdown, and the conversation is kept so follow-ups work without repeating context.
4. The UI is a PWA: installable on a phone, dark and light mode, mobile-first.

Passing the full context is a conscious design choice. At this size it is cheaper, simpler and more accurate than building a vector index — and it means the answer can be traced back to the rows that produced it. The moment the dataset grows past a few hundred records, the right move is retrieval (pgvector or a keyword pre-filter), not a bigger prompt.

## Repo layout

```
src/App.jsx                              chat UI, context fetch, LLM call
src/index.css                            theme, light/dark tokens
assets/du-logo.png                       department mark used in the header
supabase/schema.sql                      departments, teachers, programs, courses
supabase/functions/scrape-mis/index.ts   scrape + load the departmental directory
supabase/functions/search/index.ts       server-side question answering
scripts/scrape_mis.js                    source scraper (Node)
scripts/test_contact.js                  contact-data spot check
public/pwa-192x192.png, pwa-512x512.png  installable app icons
```

## Security notes (please read if you fork this)

- The **Supabase anon key is a publishable key** and is expected to be in the client. That is only safe with Row Level Security turned on. The original schema shipped without it, so the tables were readable and writable by anyone holding the anon key. Enable RLS before reusing this:

```sql
alter table departments enable row level security;
alter table teachers   enable row level security;
alter table programs   enable row level security;
alter table courses    enable row level security;

create policy "read for everyone" on teachers   for select using (true);
create policy "read for everyone" on programs   for select using (true);
create policy "read for everyone" on courses    for select using (true);
create policy "read for everyone" on departments for select using (true);
-- no insert/update/delete policies: writes stay server-side
```

- **Never put an LLM key in a `VITE_` variable.** Vite inlines those into the browser bundle, so the key ships to every visitor. That is why `supabase/functions/search` exists: the key belongs in the edge function's environment (`Deno.env.get(...)`), and the browser should call the function, not the model provider. Treat any key that has ever been in a `VITE_` variable as public and rotate it.

## Run it

```bash
npm install
npm run dev
```

Then create `.env.local` (never committed):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Load the schema with `supabase/schema.sql`, then `supabase functions deploy search` and set `GROQ_API_KEY` as a function secret:

```bash
supabase secrets set GROQ_API_KEY=...
```

## Known limitations

- No authentication — anyone with the URL can ask questions. Fine for a public directory, wrong for private records.
- Answers are only as good as the scrape; the directory is refreshed by re-running the scraper, not on a schedule.
- One LLM call per question, no caching, no streaming.
- No evaluation set — I have not measured answer accuracy, only spot-checked cases.

## Next

Cache identical questions, stream the response, and add an evaluation set of ~50 question/answer pairs so changes to the prompt can be measured instead of eyeballed.

---

**Md. Abir Ul Islam** · [GitHub](https://github.com/abir2022) · [LinkedIn](https://www.linkedin.com/in/md-abir-ul-islam/)
