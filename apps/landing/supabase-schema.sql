-- Arbi Database Schema
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/rsaayhbscztgvojhoxia/sql

-- ============================================
-- 1. User Profiles Table
-- ============================================
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  plan_name text default 'Starter',
  plan_price integer default 49,
  subscription_status text default 'trial',
  trial_ends_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.user_profiles enable row level security;

-- Policies: Users can only read/update their own profile
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- ============================================
-- 2. Arbitrage Opportunities Table
-- ============================================
create table if not exists public.opportunities (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users on delete cascade not null,
  product_name text not null,
  source_retailer text not null,
  source_price numeric(10,2) not null,
  target_platform text not null,
  target_price numeric(10,2) not null,
  profit_margin numeric(5,2) not null,
  roi_percentage numeric(5,2) not null,
  image_url text,
  product_url text,
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.opportunities enable row level security;

-- Policies
create policy "Users can view own opportunities"
  on public.opportunities for select
  using (auth.uid() = user_id);

create policy "Users can create opportunities"
  on public.opportunities for insert
  with check (auth.uid() = user_id);

create policy "Users can update own opportunities"
  on public.opportunities for update
  using (auth.uid() = user_id);

create policy "Users can delete own opportunities"
  on public.opportunities for delete
  using (auth.uid() = user_id);

-- ============================================
-- 3. Active Listings Table
-- ============================================
create table if not exists public.listings (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users on delete cascade not null,
  opportunity_id bigint references public.opportunities on delete cascade,
  product_name text not null,
  listing_platform text not null,
  listing_price numeric(10,2) not null,
  quantity integer default 1,
  status text default 'active',
  views integer default 0,
  sales integer default 0,
  revenue numeric(10,2) default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.listings enable row level security;

-- Policies
create policy "Users can view own listings"
  on public.listings for select
  using (auth.uid() = user_id);

create policy "Users can create listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own listings"
  on public.listings for update
  using (auth.uid() = user_id);

create policy "Users can delete own listings"
  on public.listings for delete
  using (auth.uid() = user_id);

-- ============================================
-- 4. User Settings Table
-- ============================================
create table if not exists public.user_settings (
  user_id uuid references auth.users on delete cascade primary key,
  arbitrage_type text default 'online',
  risk_tolerance text default 'moderate',
  max_spend_per_campaign integer default 100,
  max_daily_budget integer default 500,
  min_profit_margin integer default 20,
  auto_listing_enabled boolean default true,
  auto_pricing_enabled boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.user_settings enable row level security;

-- Policies
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

-- ============================================
-- 5. Activity Log Table
-- ============================================
create table if not exists public.activity_log (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users on delete cascade not null,
  activity_type text not null,
  title text not null,
  description text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.activity_log enable row level security;

-- Policies
create policy "Users can view own activity"
  on public.activity_log for select
  using (auth.uid() = user_id);

create policy "Users can create activity"
  on public.activity_log for insert
  with check (auth.uid() = user_id);

-- ============================================
-- 6. Indexes for Performance
-- ============================================
create index if not exists idx_opportunities_user_id on public.opportunities(user_id);
create index if not exists idx_opportunities_status on public.opportunities(status);
create index if not exists idx_listings_user_id on public.listings(user_id);
create index if not exists idx_listings_status on public.listings(status);
create index if not exists idx_activity_user_id on public.activity_log(user_id);
create index if not exists idx_activity_created_at on public.activity_log(created_at desc);

-- ============================================
-- 7. Sample Data (Optional - for testing)
-- ============================================
-- Insert sample opportunities (run after user signup)
-- Replace 'USER_UUID' with actual user ID from auth.users

-- insert into public.opportunities (user_id, product_name, source_retailer, source_price, target_platform, target_price, profit_margin, roi_percentage, status)
-- values
--   ('USER_UUID', 'Apple AirPods Pro', 'Walmart', 189.99, 'Amazon', 249.99, 60.00, 31.58, 'active'),
--   ('USER_UUID', 'Nike Air Max 270', 'Target', 89.99, 'eBay', 129.99, 40.00, 44.45, 'active'),
--   ('USER_UUID', 'Samsung Galaxy Buds', 'Best Buy', 79.99, 'Amazon', 119.99, 40.00, 50.00, 'active');

-- ============================================
-- 8. Functions for Auto-updating timestamps
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables
create trigger set_updated_at before update on public.user_profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.opportunities
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.listings
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.user_settings
  for each row execute function public.handle_updated_at();
