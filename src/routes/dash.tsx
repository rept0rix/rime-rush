import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboard, type DashData } from "@/lib/rime-data";

export const Route = createFileRoute("/dash")({ component: Dash });

function Dash() {
  const [data, setData] = useState<DashData | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let on = true;
    const load = () => {
      void getDashboard()
        .then((d) => {
          if (on) {
            setData(d);
            setErr(false);
          }
        })
        .catch(() => {
          if (on) setErr(true);
        });
    };
    load();
    const t = window.setInterval(load, 5000);
    return () => {
      on = false;
      window.clearInterval(t);
    };
  }, []);

  const maxHour = Math.max(1, ...(data?.hourly.map((h) => h.n) ?? [1]));

  return (
    <main className="min-h-dvh bg-[#08060a] px-4 py-6 text-[#f4ead8]">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-5xl tracking-wide text-[#7ee7ff]">RIME RUSH</p>
            <p className="text-sm text-[#c4a882]">Live player dashboard · refreshes every 5s</p>
          </div>
          <Link to="/" className="rounded-xl bg-[#7ee7ff] px-4 py-2 text-sm font-bold text-[#08060a]">
            Back to game
          </Link>
        </div>

        {err && !data && <p className="mt-8 text-[#ff4d8a]">Could not reach the server.</p>}
        {!data && !err && <p className="mt-8 text-[#c4a882]">Loading live data…</p>}

        {data && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat n={data.onlineCount} l="Online now" accent="#7ee7ff" />
              <Stat n={data.games24h} l="Games (24h)" accent="#ffd36a" />
              <Stat n={data.players} l="Climbers" accent="#7cffb2" />
              <Stat n={data.bestToday} l="Best floor today" accent="#ff4d8a" />
            </div>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#3a2218] bg-[#140c08] p-4">
                <h2 className="font-display text-2xl text-[#ffd36a]">Who's here</h2>
                {data.online.length === 0 && <p className="mt-2 text-sm text-[#c4a882]">Nobody online.</p>}
                <ul className="mt-3 space-y-2">
                  {data.online.map((p, i) => (
                    <li key={`${p.id}-${i}`} className="flex items-center gap-2 text-sm">
                      <span
                        className={`size-2 rounded-full ${p.status === "waiting" ? "bg-[#ffd36a]" : "bg-[#7cffb2]"}`}
                      />
                      <span className="flex-1 truncate font-bold">{p.name}</span>
                      <span className="text-[#c4a882]">{p.status === "waiting" ? "waiting" : p.screen}</span>
                      <span className="text-[#7ee7ff]">{p.mode}</span>
                      {p.floor > 0 && <span className="text-[#ffd36a]">F{p.floor}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[#3a2218] bg-[#140c08] p-4">
                <h2 className="font-display text-2xl text-[#ffd36a]">Games by hour</h2>
                <div className="mt-4 flex h-28 items-end gap-1">
                  {(data.hourly.length ? data.hourly : [{ hour: "", n: 0 }]).map((h, i) => (
                    <div key={h.hour || i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-[#7ee7ff]"
                        style={{ height: `${Math.max(6, (h.n / maxHour) * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#c4a882]">Last 24 hours · avg floor {data.avgFloor}</p>
              </div>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#3a2218] bg-[#140c08] p-4">
                <h2 className="font-display text-2xl text-[#ffd36a]">Activity</h2>
                <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
                  {data.feed.length === 0 && <li className="text-[#c4a882]">No runs yet. Play a game.</li>}
                  {data.feed.map((e, i) => (
                    <li key={`${e.at}-${i}`} className="flex gap-2 border-b border-[#3a2218] py-1.5">
                      <span className="w-16 text-[#7ee7ff]">{e.kind}</span>
                      <span className="flex-1 truncate font-bold">{e.name}</span>
                      <span className="text-[#c4a882]">{e.mode}</span>
                      <span className="text-[#ffd36a]">{e.floor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[#3a2218] bg-[#140c08] p-4">
                <h2 className="font-display text-2xl text-[#ffd36a]">Top climbers</h2>
                <ol className="mt-3 space-y-2">
                  {data.top.map((r, i) => (
                    <li key={r.userId} className="flex items-center gap-3 text-sm">
                      <span className="w-6 font-display text-xl text-[#ffd36a]">{i + 1}</span>
                      <span className="flex-1 truncate font-bold">{r.name}</span>
                      <span className="text-[#7ee7ff]">{r.floor}</span>
                      <span className="text-[#c4a882]">{r.score}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ n, l, accent }: { n: number; l: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-[#3a2218] bg-[#140c08] p-4">
      <p className="font-display text-4xl leading-none" style={{ color: accent }}>
        {n}
      </p>
      <p className="mt-1 text-xs text-[#c4a882]">{l}</p>
    </div>
  );
}
