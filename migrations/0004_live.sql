alter table rime_presence add column if not exists x real not null default 195;
alter table rime_presence add column if not exists y real not null default 22;
alter table rime_presence add column if not exists vx real not null default 0;
alter table rime_presence add column if not exists combo int not null default 0;
alter table rime_presence add column if not exists score int not null default 0;
alter table rime_presence add column if not exists alive boolean not null default true;
