-- Create sales table (Invoices)
create table if not exists public.sales (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_number text not null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  items jsonb not null default '[]'::jsonb, -- Array of {name, quantity, price, total}
  subtotal numeric not null default 0,
  tax_amount numeric default 0,
  total_amount numeric not null default 0,
  status text check (status in ('paid', 'pending', 'cancelled')) default 'pending',
  payment_method text check (payment_method in ('cash', 'card', 'upi', 'bank_transfer', 'other')),
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create purchases table
create table if not exists public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  bill_number text,
  vendor_name text not null,
  items jsonb not null default '[]'::jsonb, -- Array of {name, quantity, price, total}
  subtotal numeric not null default 0,
  tax_amount numeric default 0,
  total_amount numeric not null default 0,
  status text check (status in ('paid', 'pending')) default 'paid',
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  attachment_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.sales enable row level security;
alter table public.purchases enable row level security;

-- Policies for sales
create policy "Users can view their own sales"
  on public.sales for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sales"
  on public.sales for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sales"
  on public.sales for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sales"
  on public.sales for delete
  using (auth.uid() = user_id);

-- Policies for purchases
create policy "Users can view their own purchases"
  on public.purchases for select
  using (auth.uid() = user_id);

create policy "Users can insert their own purchases"
  on public.purchases for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own purchases"
  on public.purchases for update
  using (auth.uid() = user_id);

create policy "Users can delete their own purchases"
  on public.purchases for delete
  using (auth.uid() = user_id);
