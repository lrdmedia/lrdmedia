# Liam Hunt — Fitness Marketing Client Portal

A client portal for a fitness content marketing agency. Clients log in to view their content calendar, live Instagram/Meta ad stats, monthly reports, and approve content. The agency manages everything from a central dashboard.

## Tech Stack

- **Frontend**: React (Vite)
- **Backend**: Node.js serverless functions (Vercel)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **APIs**: Meta Marketing API, Instagram Graph API
- **Email**: Resend
- **Hosting**: Vercel

## Setup

### 1. Create a Supabase Project

1. Go to supabase.com and create a new project
2. Run the schema in `supabase/schema.sql` via the SQL Editor in your Supabase dashboard
3. Note your project URL and keys from Settings > API

### 2. Create a Meta App

1. Go to developers.facebook.com and create a new app
2. Add the **Facebook Login**, **Instagram Graph API**, and **Marketing API** products
3. Set the OAuth redirect URI to `https://your-app.vercel.app/api/meta/callback`
4. Note your App ID and App Secret

### 3. Create a Resend Account

1. Go to resend.com and create an account
2. Add and verify your sending domain
3. Get your API key

### 4. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
RESEND_API_KEY=your-resend-api-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all environment variables in the Vercel dashboard under Settings > Environment Variables.

### 6. Create Your Agency Account

In the Supabase dashboard, create a user via Authentication > Users with your email/password. Then in the SQL Editor:

```sql
UPDATE profiles SET role = 'agency' WHERE email = 'your-email@example.com';
```

## Connecting a Client's Meta & Instagram

1. Log in as the agency
2. Go to the client's portal > Live Stats
3. Click "Connect Meta Account"
4. The client will be redirected to Meta OAuth to authorize access
5. Once authorized, their Instagram and ad stats will pull automatically
6. Connection status is visible on the agency dashboard

### Required Meta Permissions

- `instagram_basic`
- `instagram_manage_insights`
- `pages_show_list`
- `ads_read`
- `read_insights`

## Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── lib/                # Shared auth + Supabase client
│   ├── clients/            # Client CRUD endpoints
│   ├── content/            # Content calendar + approval
│   ├── meta/               # Meta OAuth connect/callback
│   ├── notes/              # Agency notes (private)
│   ├── notifications/      # Email notifications (Resend)
│   ├── profile/            # User profile endpoint
│   ├── reports/            # Monthly reports CRUD
│   └── stats/              # Live Instagram + Meta ad stats
├── src/                    # React frontend
│   ├── components/         # Shared UI components
│   ├── context/            # Auth context provider
│   ├── lib/                # Supabase client + API helper
│   └── pages/              # Pages and section views
├── supabase/               # Database schema
└── vercel.json             # Vercel config
```

## Features

- **Agency Dashboard**: View all clients with traffic light status, ad spend, enquiries, Meta connection status
- **Client Overview**: Business details, 90-day goals, buyer persona, core offer — editable by agency
- **Content Management**: Content calendar, pillars, and approval flow
- **Live Stats**: Auto-pulled from Instagram Graph API and Meta Marketing API
- **Monthly Reports**: Structured reports archived by month, published by agency
- **Agency Notes**: Private notes per client for strategy prep (hidden from clients)
- **Notifications**: Email alerts for new reports, content uploads, and client feedback

## Development

```bash
npm install
npm run dev
```

The Vite dev server runs at http://localhost:5173. For full-stack local development with API routes, run `vercel dev`.
