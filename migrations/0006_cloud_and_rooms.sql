-- Migration 0006: Cloud save profile extension and active room matchmaking
alter table rime_profiles add column if not exists coins int not null default 0;
alter table rime_profiles add column if not exists outfit int not null default 0;
alter table rime_profiles add column if not exists weapon text not null default 'blade';
alter table rime_profiles add column if not exists owned_weapons text not null default '["blade"]';
alter table rime_profiles add column if not exists owned_skins text not null default '[0,1,2]';
alter table rime_profiles add column if not exists settings_json text not null default '{}';

create table if not exists rime_rooms (
  room text primary key,
  host_id text not null,
  host_name text not null,
  mode text not null default 'laststand',
  players_count int not null default 1,
  max_players int not null default 4,
  is_public boolean not null default true,
  status text not null default 'waiting',
  updated_at timestamptz not null default now()
);
create index if not exists rime_rooms_public_idx on rime_rooms (is_public, status, updated_at desc);
