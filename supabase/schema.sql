-- Supabase Schema for MIS AI Agent

-- Enable pgvector for semantic search (if available/needed later)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id),
    name TEXT NOT NULL,
    designation TEXT,
    image_url TEXT,
    profile_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id),
    title TEXT NOT NULL,
    duration TEXT,
    overview TEXT,
    program_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(id),
    semester TEXT,
    course_code TEXT,
    course_title TEXT,
    credits TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Initial Data for MIS Department
INSERT INTO departments (name, url) 
VALUES ('Management Information Systems', 'https://www.du.ac.bd/body/MIS')
ON CONFLICT (name) DO NOTHING;
