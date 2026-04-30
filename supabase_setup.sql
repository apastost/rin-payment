-- รัน SQL นี้ใน Supabase SQL Editor
-- Table: room_payments

create table if not exists room_payments (
  id         bigint generated always as identity primary key,
  zone       text not null,
  room       text not null,
  amount     numeric not null,
  month      text not null,
  updated_at timestamptz default now(),
  unique (zone, room)
);

-- เปิด RLS (Row Level Security)
alter table room_payments enable row level security;

-- อนุญาตให้ทุกคนอ่านได้ (ผู้เช่าดูยอดได้)
create policy "allow_read" on room_payments
  for select using (true);

-- อนุญาตให้ insert/update/delete (Admin จัดการยอด)
create policy "allow_all" on room_payments
  for all using (true) with check (true);
