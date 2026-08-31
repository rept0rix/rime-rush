create table if not exists rime_presence (
  client_id text primary key,
  user_id text,
  name text not null,
  screen text not null default 'menu',
  mode text not null default 'solo',
  floor int not null default 0,
  color int not null default 0,
  last_seen timestamptz not null default now()
);
create index if not exists rime_presence_seen_idx on rime_presence (last_seen desc);

create table if not exists rime_events (
  id serial primary key,
  client_id text not null,
  user_id text,
  name text not null,
  kind text not null,
  mode text not null default '',
  floor int not null default 0,
  score int not null default 0,
  combo int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists rime_events_created_idx on rime_events (created_at desc);
