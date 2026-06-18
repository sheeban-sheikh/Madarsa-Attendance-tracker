# Supabase Setup Guide & Database Schema

This document provides setup instructions, SQL schema, Row Level Security (RLS) policies, storage bucket configurations, and environment variables needed to connect the Madarsa Attendance Tracker application to Supabase.

---

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign in or create an account.
2. Click **New Project** and select your organization.
3. Fill in the project details:
   - **Name**: `Madarsa Attendance Tracker`
   - **Database Password**: *Choose a secure password*
   - **Region**: Select a region close to your users.
4. Click **Create new project** and wait for database provisioning.

---

## 2. Execute SQL Database Schema & RLS Policies

Go to the **SQL Editor** tab in your Supabase Dashboard, create a new query, paste the following SQL script, and click **Run**:

```sql
-- 1. Create Madarsas Table
CREATE TABLE public.madarsas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Public Users (Profiles) Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'madarsa_admin')),
    madarsa_id UUID REFERENCES public.madarsas(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Students Table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    photo_url TEXT,
    madarsa_id UUID NOT NULL REFERENCES public.madarsas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Attendance Table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (student_id, attendance_date)
);

-- 5. Helper Functions for RLS Queries
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_madarsa_id()
RETURNS uuid AS $$
  SELECT madarsa_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.madarsas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Madarsas: Super admin has full access; Madarsa admin can read only their own.
CREATE POLICY "Select Madarsa Policy" ON public.madarsas 
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (get_user_role() = 'super_admin' OR id = get_user_madarsa_id())
);

CREATE POLICY "Write Madarsa Policy" ON public.madarsas 
FOR ALL USING (
  auth.uid() IS NOT NULL AND get_user_role() = 'super_admin'
);

-- Users (Profiles): Super admin full access; User can read/write their own profile.
CREATE POLICY "Users Profile Policy" ON public.users 
FOR ALL USING (
  auth.uid() IS NOT NULL AND (get_user_role() = 'super_admin' OR id = auth.uid())
);

-- Students: Super admin full access; Madarsa admin can access students from their assigned Madarsa.
CREATE POLICY "Students Access Policy" ON public.students 
FOR ALL USING (
  auth.uid() IS NOT NULL AND (get_user_role() = 'super_admin' OR madarsa_id = get_user_madarsa_id())
);

-- Attendance: Super admin full access; Madarsa admin can access records belonging to their students.
CREATE POLICY "Attendance Access Policy" ON public.attendance 
FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    get_user_role() = 'super_admin' OR 
    (SELECT madarsa_id FROM public.students WHERE id = student_id) = get_user_madarsa_id()
  )
);
```

---

## 3. Create Student Photos Storage Bucket

For student photos storage:
1. Go to the **Storage** tab in your Supabase Dashboard.
2. Click **New Bucket**.
3. Set **Bucket Name** to: `student-photos`.
4. Make the bucket **Public** (so public URLs are generated automatically for student avatars).
5. Click **Create bucket**.
6. Set the **Storage Policies** so authenticated users can read/write objects:
   - Go to **Policies** in Storage settings.
   - For `student-photos` bucket, add a policy: **Allow Authenticated Users to Upload and Read**.
   - Select **Insert**, **Select**, **Update**, and **Delete** for Authenticated users.

---

## 4. Setup Environment Variables

Create a `.env` file at the root of the project (or copy the `.env.example` file) and provide your project URL and public anon key:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

To find these credentials:
1. Go to **Project Settings** > **API**.
2. Copy your **Project URL** and paste it for `VITE_SUPABASE_URL`.
3. Copy your **anon / public** API key and paste it for `VITE_SUPABASE_ANON_KEY`.

---

## 5. Provision Admin Accounts (Authentication)

To log in, you will need user credentials in both Supabase Auth and the `public.users` table:

1. Go to the **Authentication** > **Users** tab and click **Add User** > **Create User**. Enter an email and password.
2. Copy the generated **User ID** (UUID).
3. Go to the **Table Editor** > `users` table and click **Insert Row**.
   - Set `id` to the **User ID** from step 1.
   - Set `email` to the user's email.
   - Set `role` to either `super_admin` or `madarsa_admin`.
   - Set `madarsa_id` to the corresponding Madarsa UUID (only for `madarsa_admin` users).
