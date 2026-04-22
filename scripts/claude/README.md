# Claude CLI helpers

Small Node scripts so Claude Code (or you) can read/update the work dashboard from the terminal. Each script uses the Supabase service-role key from `.env.local` and prints a one-line confirmation.

## Setup

1. Copy `.env.example` → `.env.local` at the repo root and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. Make sure `npm install` has been run.

## Commands

```
node scripts/claude/briefing.js                                   # daily briefing
node scripts/claude/add-task.js "Call Dan" --due=2026-04-23       # add a task
node scripts/claude/add-task.js "Film proof reel" --priority=high
node scripts/claude/move-lead.js @evolveptstudio call_booked      # move lead stage
```

Tell Claude things like "add a task to call Storme tomorrow" and it will run `add-task.js` for you.
