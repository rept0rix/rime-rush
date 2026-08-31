create table if not exists rime_scores (
  id serial primary key,
  user_id text not null,
  name text not null,
  floor int not null,
  score int not null,
  combo int not null,
  mode text not null,
  created_at timestamptz not null default now()
);
create index if not exists rime_scores_board_idx on rime_scores (floor desc, score desc);
create index if not exists rime_scores_user_idx on rime_scores (user_id);

create table if not exists rime_profiles (
  user_id text primary key,
  name text not null,
  color int not null default 0,
  best_floor int not null default 0,
  best_score int not null default 0,
  best_combo int not null default 0,
  games int not null default 0,
  badges text not null default '[]',
  updated_at timestamptz not null default now()
);
