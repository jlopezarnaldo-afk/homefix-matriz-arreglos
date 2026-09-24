-- ========================================================================
-- HomeFix: Matriz de Arreglos del Hogar - Supabase Database Schema
-- Ready to run in Supabase SQL Editor
-- Target Table: public.homefix_tasks
-- ========================================================================

-- 1. Enable UUID Extension (standard PostgreSQL / Supabase)
create extension if not exists "uuid-ossp";

-- 2. Create homefix_tasks Table
create table if not exists public.homefix_tasks (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(trim(title)) >= 3 and char_length(title) <= 120),
    room text not null check (room in ('cocina', 'baño', 'bano', 'living', 'dormitorio', 'exterior', 'general')),
    urgency int not null check (urgency between 1 and 5),
    effort int not null check (effort between 1 and 5),
    cost numeric(10, 2) check (cost is null or cost >= 0),
    execution_type text not null check (execution_type in ('diy', 'profesional')),
    status text not null default 'pendiente' check (status in ('pendiente', 'en_proceso', 'listo')),
    payment_mode text check (payment_mode is null or payment_mode in ('un_pago', 'cuotas')),
    installments_count int check (installments_count is null or installments_count >= 1),
    installment_amount numeric(10, 2) check (installment_amount is null or installment_amount >= 0),
    resolved_at timestamptz,
    resolved_notes text,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Support adding columns if table already existed
alter table public.homefix_tasks add column if not exists payment_mode text check (payment_mode is null or payment_mode in ('un_pago', 'cuotas'));
alter table public.homefix_tasks add column if not exists installments_count int check (installments_count is null or installments_count >= 1);
alter table public.homefix_tasks add column if not exists installment_amount numeric(10, 2) check (installment_amount is null or installment_amount >= 0);
alter table public.homefix_tasks add column if not exists resolved_at timestamptz;
alter table public.homefix_tasks add column if not exists resolved_notes text;

-- 3. Optimization Indexes for Multi-Filtering and Priority Sorting
create index if not exists idx_homefix_tasks_status on public.homefix_tasks (status);
create index if not exists idx_homefix_tasks_urgency on public.homefix_tasks (urgency);
create index if not exists idx_homefix_tasks_room on public.homefix_tasks (room);
create index if not exists idx_homefix_tasks_execution on public.homefix_tasks (execution_type);
create index if not exists idx_homefix_tasks_urgency_effort on public.homefix_tasks (urgency desc, effort asc);
create index if not exists idx_homefix_tasks_created_at on public.homefix_tasks (created_at desc);

-- 4. Automatic updated_at Timestamp Trigger
create or replace function public.handle_homefix_tasks_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

drop trigger if exists tr_homefix_tasks_updated_at on public.homefix_tasks;
create trigger tr_homefix_tasks_updated_at
    before update on public.homefix_tasks
    for each row
    execute function public.handle_homefix_tasks_updated_at();

-- 5. Row Level Security (RLS) Configuration
alter table public.homefix_tasks enable row level security;

-- Drop prior policies if re-running
drop policy if exists "Allow anonymous select on homefix_tasks" on public.homefix_tasks;
drop policy if exists "Allow anonymous insert on homefix_tasks" on public.homefix_tasks;
drop policy if exists "Allow anonymous update on homefix_tasks" on public.homefix_tasks;
drop policy if exists "Allow anonymous delete on homefix_tasks" on public.homefix_tasks;

-- Public/Anonymous CRUD Policies for SPA Demo
create policy "Allow anonymous select on homefix_tasks"
    on public.homefix_tasks
    for select
    to anon, authenticated
    using (true);

create policy "Allow anonymous insert on homefix_tasks"
    on public.homefix_tasks
    for insert
    to anon, authenticated
    with check (true);

create policy "Allow anonymous update on homefix_tasks"
    on public.homefix_tasks
    for update
    to anon, authenticated
    using (true)
    with check (true);

create policy "Allow anonymous delete on homefix_tasks"
    on public.homefix_tasks
    for delete
    to anon, authenticated
    using (true);

-- 6. Insert Default Seed Tasks
insert into public.homefix_tasks (id, title, room, urgency, effort, cost, execution_type, status)
values
    ('11111111-1111-4111-8111-111111111111', 'Pérdida de agua bajo la bacha de cocina', 'cocina', 5, 2, 8500.00, 'diy', 'pendiente'),
    ('22222222-2222-4222-8222-222222222222', 'Reparación de filtración y grieta en techo de living', 'living', 4, 5, 120000.00, 'profesional', 'en_proceso'),
    ('33333333-3333-4333-8333-333333333333', 'Ajustar picaporte flojo y lubricar cerradura', 'dormitorio', 2, 1, 0.00, 'diy', 'pendiente'),
    ('44444444-4444-4444-8444-444444444444', 'Instalar estanterías flotantes y organizador de baño', 'baño', 2, 3, 45000.00, 'diy', 'pendiente')
on conflict (id) do nothing;
