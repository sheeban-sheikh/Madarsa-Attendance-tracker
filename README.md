# Madarsa Attendance Tracker

A responsive cloud-based Multi-Madarsa Attendance Tracker using React, Vite, and Supabase.

## Supabase Migration & Setup

The application has been migrated from local browser storage to a cloud-based Supabase database and authentication system.

Please refer to the [SUPABASE_SETUP.md](file:///c:/Users/Sheeban/Downloads/Madarsa%20Tracker/SUPABASE_SETUP.md) for database schema, RLS policies, storage bucket configurations, and environment variables.

## Running Locally

1. Create a `.env` file at the root of the project with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Key Technologies
- **Vite + React**: Core Framework
- **Supabase**: Auth, Database (PostgreSQL), and Object Storage
- **TailwindCSS**: Premium responsive styles (Vanilla style and Tailwind tokens)
- **Lucide React**: Icons
- **Urdu Translation**: Full Urdu and English toggling support

