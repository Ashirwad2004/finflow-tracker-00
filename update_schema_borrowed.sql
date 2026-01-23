-- Create table for tracking borrowed money (debts)
create table public.borrowed_money (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  user_id uuid not null default auth.uid (),
  amount numeric not null,
  person_name text not null,
  description text null,
  due_date timestamp with time zone null,
  status text not null default 'pending'::text, -- 'pending', 'repaid'
  constraint borrowed_money_pkey primary key (id),
  constraint borrowed_money_user_id_fkey foreign key (user_id) references auth.users (id) on update cascade on delete cascade
);

-- Enable RLS
alter table public.borrowed_money enable row level security;

-- Policies
create policy "Users can view their own borrowed money records" on public.borrowed_money
  for select using (auth.uid() = user_id);

create policy "Users can insert their own borrowed money records" on public.borrowed_money
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own borrowed money records" on public.borrowed_money
  for update using (auth.uid() = user_id);

create policy "Users can delete their own borrowed money records" on public.borrowed_money
  for delete using (auth.uid() = user_id);
