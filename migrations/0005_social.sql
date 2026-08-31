alter table rime_presence add column if not exists status text not null default 'online';

create table if not exists rime_friends (
  owner_id text not null,
  friend_id text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, friend_id)
);
create index if not exists rime_friends_friend_idx on rime_friends (friend_id);

create table if not exists rime_notes (
  id serial primary key,
  to_id text not null,
  from_id text not null,
  from_name text not null,
  kind text not null,
  body text not null default '',
  room text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists rime_notes_to_idx on rime_notes (to_id, created_at desc);
