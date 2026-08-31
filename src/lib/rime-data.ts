import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { PresenceStatus } from "@/game/types";

export type BoardRow = {
  name: string;
  floor: number;
  score: number;
  combo: number;
  userId: string;
};

export type PresenceRow = {
  id: string;
  name: string;
  screen: string;
  mode: string;
  floor: number;
  color: number;
  status: PresenceStatus;
};

export type LiveClimber = {
  id: string;
  name: string;
  color: number;
  floor: number;
  x: number;
  y: number;
  vx: number;
  combo: number;
  score: number;
  alive: boolean;
  screen: string;
};

export type FeedRow = {
  name: string;
  kind: string;
  mode: string;
  floor: number;
  score: number;
  combo: number;
  at: string;
};

export type DashData = {
  online: PresenceRow[];
  onlineCount: number;
  waitingCount: number;
  games24h: number;
  players: number;
  bestToday: number;
  avgFloor: number;
  feed: FeedRow[];
  hourly: { hour: string; n: number }[];
  top: BoardRow[];
};

export type FriendRow = {
  id: string;
  name: string;
  color: number;
  status: PresenceStatus;
  screen: string;
  floor: number;
  seen: boolean;
};

export type NoteRow = {
  id: number;
  fromId: string;
  fromName: string;
  kind: "join" | "invite" | "online";
  body: string;
  room: string;
  read: boolean;
  at: string;
};

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "anon";
}
function cleanName(name: string): string {
  return name.trim().slice(0, 16) || "Climber";
}
function cleanStatus(v: unknown): PresenceStatus {
  return v === "offline" || v === "waiting" ? v : "online";
}
function cleanRoom(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}
function asStatus(v: unknown): PresenceStatus {
  return cleanStatus(v);
}

export const listBoard = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{
    name: string;
    floor: number;
    score: number;
    combo: number;
    user_id: string;
  }>`
    select user_id, max(name) as name, max(floor) as floor, max(score) as score, max(combo) as combo
    from rime_scores
    group by user_id
    order by max(floor) desc, max(score) desc
    limit 25
  `;
  return rows.map((r) => ({
    name: r.name,
    floor: r.floor,
    score: r.score,
    combo: r.combo,
    userId: r.user_id,
  }));
});

export const submitRun = createServerFn({ method: "POST" })
  .validator(
    (d: {
      clientId: string;
      name: string;
      floor: number;
      score: number;
      combo: number;
      mode: string;
      badges: string[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const userId = cleanId(data.clientId);
    const name = cleanName(data.name);
    const floor = Math.max(0, Math.floor(data.floor));
    const score = Math.max(0, Math.floor(data.score));
    const combo = Math.max(0, Math.floor(data.combo));
    const mode = data.mode.slice(0, 16);
    await sql`
      insert into rime_scores (user_id, name, floor, score, combo, mode)
      values (${userId}, ${name}, ${floor}, ${score}, ${combo}, ${mode})
    `;
    const badges = JSON.stringify((data.badges ?? []).slice(0, 32));
    await sql`
      insert into rime_profiles (user_id, name, color, best_floor, best_score, best_combo, games, badges)
      values (${userId}, ${name}, 0, ${floor}, ${score}, ${combo}, 1, ${badges})
      on conflict (user_id) do update set
        name = excluded.name,
        best_floor = greatest(rime_profiles.best_floor, excluded.best_floor),
        best_score = greatest(rime_profiles.best_score, excluded.best_score),
        best_combo = greatest(rime_profiles.best_combo, excluded.best_combo),
        games = rime_profiles.games + 1,
        badges = excluded.badges,
        updated_at = now()
    `;
    await sql`
      insert into rime_events (client_id, user_id, name, kind, mode, floor, score, combo)
      values (${userId}, ${userId}, ${name}, ${"finish"}, ${mode}, ${floor}, ${score}, ${combo})
    `;
  });

export const pingPresence = createServerFn({ method: "POST" })
  .validator(
    (d: {
      clientId: string;
      name: string;
      screen: string;
      mode: string;
      floor: number;
      color: number;
      x?: number;
      y?: number;
      vx?: number;
      combo?: number;
      score?: number;
      alive?: boolean;
      status?: PresenceStatus;
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const sql = await getSql();
      const id = cleanId(data.clientId);
      const name = cleanName(data.name);
      const screen = data.screen.slice(0, 16);
      const mode = data.mode.slice(0, 16);
      const floor = Math.max(0, Math.floor(data.floor));
      const color = Math.max(0, Math.floor(data.color) % 8);
      const x = Number.isFinite(data.x) ? Math.max(0, Math.min(390, data.x as number)) : 195;
      const y = Number.isFinite(data.y) ? (data.y as number) : 22;
      const vx = Number.isFinite(data.vx) ? Math.max(-400, Math.min(400, data.vx as number)) : 0;
      const combo = Math.max(0, Math.floor(data.combo ?? 0));
      const score = Math.max(0, Math.floor(data.score ?? 0));
      const alive = data.alive !== false;
      const status = cleanStatus(data.status);
      const prev = await sql<{ status: string }>`
        select status from rime_presence where client_id = ${id}
      `;
      const prevStatus = asStatus(prev[0]?.status ?? "offline");
      await sql`
        insert into rime_presence (client_id, user_id, name, screen, mode, floor, color, x, y, vx, combo, score, alive, status, last_seen)
        values (${id}, ${id}, ${name}, ${screen}, ${mode}, ${floor}, ${color}, ${x}, ${y}, ${vx}, ${combo}, ${score}, ${alive}, ${status}, now())
        on conflict (client_id) do update set
          name = excluded.name,
          screen = excluded.screen,
          mode = excluded.mode,
          floor = excluded.floor,
          color = excluded.color,
          x = excluded.x,
          y = excluded.y,
          vx = excluded.vx,
          combo = excluded.combo,
          score = excluded.score,
          alive = excluded.alive,
          status = excluded.status,
          last_seen = now()
      `;
      if (status === "online" && prevStatus !== "online") {
        await sql`
          insert into rime_notes (to_id, from_id, from_name, kind, body, room)
          select f.owner_id, ${id}, ${name}, ${"join"}, ${`${name} is online`}, ${""}
          from rime_friends f
          join rime_presence p on p.client_id = f.owner_id
          where f.friend_id = ${id}
            and f.owner_id <> ${id}
            and p.status in ('online', 'waiting')
            and p.last_seen > now() - interval '2 minutes'
            and not exists (
              select 1 from rime_notes n
              where n.to_id = f.owner_id
                and n.from_id = ${id}
                and n.kind = 'join'
                and n.created_at > now() - interval '10 minutes'
            )
        `;
      }
    } catch {
      /* table may not exist yet */
    }
  });

export const logEvent = createServerFn({ method: "POST" })
  .validator(
    (d: {
      clientId: string;
      name: string;
      kind: string;
      mode: string;
      floor?: number;
      score?: number;
      combo?: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const sql = await getSql();
      const id = cleanId(data.clientId);
      await sql`
        insert into rime_events (client_id, user_id, name, kind, mode, floor, score, combo)
        values (
          ${id}, ${id}, ${cleanName(data.name)}, ${data.kind.slice(0, 16)},
          ${data.mode.slice(0, 16)}, ${Math.max(0, Math.floor(data.floor ?? 0))},
          ${Math.max(0, Math.floor(data.score ?? 0))}, ${Math.max(0, Math.floor(data.combo ?? 0))}
        )
      `;
    } catch {
      /* ignore */
    }
  });

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const empty: DashData = {
    online: [],
    onlineCount: 0,
    waitingCount: 0,
    games24h: 0,
    players: 0,
    bestToday: 0,
    avgFloor: 0,
    feed: [],
    hourly: [],
    top: [],
  };
  try {
    const sql = await getSql();
  const online = await sql<{
    client_id: string;
    name: string;
    screen: string;
    mode: string;
    floor: number;
    color: number;
    status: string;
  }>`
    select client_id, name, screen, mode, floor, color, status
    from rime_presence
    where last_seen > now() - interval '25 seconds'
      and status <> 'offline'
    order by last_seen desc
    limit 40
  `;
  const stats = await sql<{
    games: number;
    players: number;
    best: number;
    avg: number;
  }>`
    select
      count(*)::int as games,
      count(distinct user_id)::int as players,
      coalesce(max(floor), 0)::int as best,
      coalesce(avg(floor), 0)::float as avg
    from rime_scores
    where created_at > now() - interval '24 hours'
  `;
  const allPlayers = await sql<{ n: number }>`
    select count(*)::int as n from rime_profiles
  `;
  const feed = await sql<{
    name: string;
    kind: string;
    mode: string;
    floor: number;
    score: number;
    combo: number;
    created_at: string | Date;
  }>`
    select name, kind, mode, floor, score, combo, created_at
    from rime_events
    order by id desc
    limit 40
  `;
  const hourly = await sql<{ hour: string | Date; n: number }>`
    select date_trunc('hour', created_at) as hour, count(*)::int as n
    from rime_scores
    where created_at > now() - interval '24 hours'
    group by 1
    order by 1
  `;
  const top = await sql<{
    name: string;
    floor: number;
    score: number;
    combo: number;
    user_id: string;
  }>`
    select user_id, max(name) as name, max(floor) as floor, max(score) as score, max(combo) as combo
    from rime_scores
    group by user_id
    order by max(floor) desc, max(score) desc
    limit 10
  `;
  const s = stats[0];
  const mapped: PresenceRow[] = online.map((r) => ({
    id: r.client_id,
    name: r.name,
    screen: r.screen,
    mode: r.mode,
    floor: r.floor,
    color: r.color,
    status: asStatus(r.status),
  }));
  return {
    online: mapped,
    onlineCount: mapped.filter((p) => p.status === "online").length,
    waitingCount: mapped.filter((p) => p.status === "waiting").length,
    games24h: s?.games ?? 0,
    players: allPlayers[0]?.n ?? 0,
    bestToday: s?.best ?? 0,
    avgFloor: Math.round(s?.avg ?? 0),
    feed: feed.map((r) => ({
      name: r.name,
      kind: r.kind,
      mode: r.mode,
      floor: r.floor,
      score: r.score,
      combo: r.combo,
      at: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    })),
    hourly: hourly.map((r) => ({
      hour: typeof r.hour === "string" ? r.hour : new Date(r.hour).toISOString(),
      n: r.n,
    })),
    top: top.map((r) => ({
      name: r.name,
      floor: r.floor,
      score: r.score,
      combo: r.combo,
      userId: r.user_id,
    })),
  } satisfies DashData;
  } catch {
    return empty;
  }
});

export const listLiveClimbers = createServerFn({ method: "POST" })
  .validator((d: { clientId: string }) => d)
  .handler(async ({ data }) => {
    const empty: LiveClimber[] = [];
    try {
      const sql = await getSql();
      const self = data.clientId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
      const rows = await sql<{
        client_id: string;
        name: string;
        color: number;
        floor: number;
        x: number;
        y: number;
        vx: number;
        combo: number;
        score: number;
        alive: boolean;
        screen: string;
      }>`
        select client_id, name, color, floor, x, y, vx, combo, score, alive, screen
        from rime_presence
        where last_seen > now() - interval '8 seconds'
          and client_id <> ${self}
          and status = 'online'
        order by last_seen desc
        limit 12
      `;
      return rows.map((r) => ({
        id: r.client_id,
        name: r.name,
        color: r.color,
        floor: r.floor,
        x: r.x,
        y: r.y,
        vx: r.vx,
        combo: r.combo,
        score: r.score,
        alive: r.alive !== false,
        screen: r.screen,
      })) satisfies LiveClimber[];
    } catch {
      return empty;
    }
  });

export const saveMyRun = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      name: string;
      floor: number;
      score: number;
      combo: number;
      mode: string;
      badges: string[];
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const userId = context.userId;
    const name = data.name.trim().slice(0, 16) || "Climber";
    const floor = Math.max(0, Math.floor(data.floor));
    const score = Math.max(0, Math.floor(data.score));
    const combo = Math.max(0, Math.floor(data.combo));
    const mode = data.mode.slice(0, 16);
    const badges = JSON.stringify((data.badges ?? []).slice(0, 32));
    await sql`
      insert into rime_scores (user_id, name, floor, score, combo, mode)
      values (${userId}, ${name}, ${floor}, ${score}, ${combo}, ${mode})
    `;
    await sql`
      insert into rime_profiles (user_id, name, color, best_floor, best_score, best_combo, games, badges)
      values (${userId}, ${name}, 0, ${floor}, ${score}, ${combo}, 1, ${badges})
      on conflict (user_id) do update set
        name = excluded.name,
        best_floor = greatest(rime_profiles.best_floor, excluded.best_floor),
        best_score = greatest(rime_profiles.best_score, excluded.best_score),
        best_combo = greatest(rime_profiles.best_combo, excluded.best_combo),
        games = rime_profiles.games + 1,
        badges = excluded.badges,
        updated_at = now()
    `;
  });

export const listFriends = createServerFn({ method: "POST" })
  .validator((d: { clientId: string }) => d)
  .handler(async ({ data }) => {
    const empty: FriendRow[] = [];
    try {
      const sql = await getSql();
      const id = cleanId(data.clientId);
      const rows = await sql<{
        friend_id: string;
        name: string | null;
        color: number | null;
        status: string | null;
        screen: string | null;
        floor: number | null;
        last_seen: string | Date | null;
      }>`
        select f.friend_id, p.name, p.color, p.status, p.screen, p.floor, p.last_seen
        from rime_friends f
        left join rime_presence p on p.client_id = f.friend_id
        where f.owner_id = ${id}
        order by
          case when p.status = 'online' then 0 when p.status = 'waiting' then 1 else 2 end,
          p.last_seen desc nulls last
        limit 40
      `;
      return rows.map((r) => {
        const seenAt = r.last_seen
          ? typeof r.last_seen === "string"
            ? Date.parse(r.last_seen)
            : r.last_seen.getTime()
          : 0;
        const fresh = seenAt > Date.now() - 25_000;
        const status: PresenceStatus = fresh ? asStatus(r.status) : "offline";
        return {
          id: r.friend_id,
          name: r.name || "Climber",
          color: r.color ?? 0,
          status,
          screen: r.screen || "menu",
          floor: r.floor ?? 0,
          seen: fresh,
        };
      }) satisfies FriendRow[];
    } catch {
      return empty;
    }
  });

export const addFriend = createServerFn({ method: "POST" })
  .validator((d: { clientId: string; friendId: string }) => d)
  .handler(async ({ data }) => {
    const owner = cleanId(data.clientId);
    const friend = cleanId(data.friendId);
    if (owner === friend) return { ok: false as const };
    try {
      const sql = await getSql();
      await sql`
        insert into rime_friends (owner_id, friend_id)
        values (${owner}, ${friend})
        on conflict (owner_id, friend_id) do nothing
      `;
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

export const removeFriend = createServerFn({ method: "POST" })
  .validator((d: { clientId: string; friendId: string }) => d)
  .handler(async ({ data }) => {
    try {
      const sql = await getSql();
      await sql`
        delete from rime_friends
        where owner_id = ${cleanId(data.clientId)} and friend_id = ${cleanId(data.friendId)}
      `;
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

export const inviteFriend = createServerFn({ method: "POST" })
  .validator(
    (d: { clientId: string; name: string; toId: string; room: string }) => d,
  )
  .handler(async ({ data }) => {
    const fromId = cleanId(data.clientId);
    const toId = cleanId(data.toId);
    const room = cleanRoom(data.room);
    const name = cleanName(data.name);
    if (!room || fromId === toId) return { ok: false as const };
    try {
      const sql = await getSql();
      await sql`
        insert into rime_notes (to_id, from_id, from_name, kind, body, room)
        select ${toId}, ${fromId}, ${name}, ${"invite"}, ${`${name} invited you to ${room}`}, ${room}
        where not exists (
          select 1 from rime_notes n
          where n.to_id = ${toId}
            and n.from_id = ${fromId}
            and n.kind = 'invite'
            and n.room = ${room}
            and n.read = false
        )
      `;
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

export const listNotes = createServerFn({ method: "POST" })
  .validator((d: { clientId: string }) => d)
  .handler(async ({ data }) => {
    const empty: { notes: NoteRow[]; unread: number } = { notes: [], unread: 0 };
    try {
      const sql = await getSql();
      const id = cleanId(data.clientId);
      const rows = await sql<{
        id: number;
        from_id: string;
        from_name: string;
        kind: string;
        body: string;
        room: string;
        read: boolean;
        created_at: string | Date;
      }>`
        select id, from_id, from_name, kind, body, room, read, created_at
        from rime_notes
        where to_id = ${id}
        order by id desc
        limit 30
      `;
      const notes: NoteRow[] = rows.map((r) => ({
        id: r.id,
        fromId: r.from_id,
        fromName: r.from_name,
        kind: r.kind === "invite" ? "invite" : r.kind === "online" ? "online" : "join",
        body: r.body,
        room: r.room,
        read: r.read === true,
        at: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
      }));
      return { notes, unread: notes.filter((n) => !n.read).length };
    } catch {
      return empty;
    }
  });

export const markNotesRead = createServerFn({ method: "POST" })
  .validator((d: { clientId: string; ids?: number[] }) => d)
  .handler(async ({ data }) => {
    try {
      const sql = await getSql();
      const id = cleanId(data.clientId);
      const ids = (data.ids ?? []).map((n) => Math.floor(n)).filter((n) => n > 0).slice(0, 40);
      if (ids.length === 0) {
        await sql`update rime_notes set read = true where to_id = ${id} and read = false`;
      } else {
        for (const noteId of ids) {
          await sql`update rime_notes set read = true where id = ${noteId} and to_id = ${id}`;
        }
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

export const purgeMyAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const id = context.userId;
    await sql`delete from rime_scores where user_id = ${id}`;
    await sql`delete from rime_profiles where user_id = ${id}`;
    await sql`delete from rime_presence where user_id = ${id} or client_id = ${id}`;
    await sql`delete from rime_events where user_id = ${id} or client_id = ${id}`;
    await sql`delete from rime_friends where owner_id = ${id} or friend_id = ${id}`;
    await sql`delete from rime_notes where to_id = ${id} or from_id = ${id}`;
    return { ok: true as const };
  });
