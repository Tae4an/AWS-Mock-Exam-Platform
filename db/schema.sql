-- Questions table schema (run in Supabase SQL editor)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null unique,
  options jsonb not null,
  answer text not null,
  explanation text,
  category text default 'SAA',
  difficulty text check (difficulty in ('easy','medium','hard')) default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_questions_category on public.questions (category);
create index if not exists idx_questions_created_at on public.questions (created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_questions_updated_at on public.questions;
create trigger trg_questions_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

-- Optionally, relax RLS for bulk insert (adjust based on your security model)
-- alter table public.questions enable row level security;
-- create policy "Allow read to anon" on public.questions for select using (true);
-- create policy "Allow insert to service key" on public.questions for insert with check (true);

