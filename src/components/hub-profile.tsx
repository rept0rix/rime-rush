import { signOut } from "@/lib/auth/client";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { ArcadeConfirm } from "@/components/arcade-confirm";
import { FeelTiles, PlaqueBtn } from "@/components/feel-tiles";
import { PlayerFace } from "@/components/player-face";
import { FacebookMark, GoogleMark, SocialButtons, TikTokMark, XMark } from "@/components/social-buttons";
import { StatusDot, statusLabel } from "@/components/status-dot";
import { StatusPicker } from "@/components/status-picker";
import { BADGES, badgeHint, badgeName } from "@/game/achievements";
import { applyShake, applySound } from "@/game/haptics";
import { t } from "@/game/i18n";
import { rankName } from "@/game/ranks";
import { makeRoomCode } from "@/game/room";
import { SKIN_PRICE, WEAPON_SHOP } from "@/game/shop";
import { SKINS } from "@/game/sprites";
import { useGame } from "@/game/store";
import type { Lang, PresenceStatus, WeaponId } from "@/game/types";
import { requestAlerts } from "@/lib/alerts";
import { clientId } from "@/lib/client-id";
import { inviteFriend, listFriends, purgeMyAccount, removeFriend, type FriendRow } from "@/lib/rime-data";
import { UserMinus } from "lucide-react";
import { useEffect, useState } from "react";

export function HubProfile() {
  const save = useGame((s) => s.save);
  const patchSave = useGame((s) => s.patchSave);
  const setHub = useGame((s) => s.setHub);
  const setOverlay = useGame((s) => s.setOverlay);
  const wipeSave = useGame((s) => s.wipeSave);
  const user = useCurrentUser();
  const { isPending } = useCurrentUserState();
  const lang = save.lang;
  const copy = t(lang);
  const skin = SKINS[save.color % SKINS.length]!;
  const signedIn = !!user && !user.isDevFallback;
  const [crew, setCrew] = useState<FriendRow[]>([]);
  const [invited, setInvited] = useState("");
  const [confirm, setConfirm] = useState<null | "out" | "del">(null);
  const [busy, setBusy] = useState(false);
  const selfId = clientId();

  useEffect(() => {
    if (!signedIn || !user) return;
    const next: { name?: string } = {};
    if (!save.name.trim() && user.displayName) next.name = user.displayName.slice(0, 12);
    if (next.name) patchSave(next);
  }, [signedIn, user, save.name, patchSave]);

  const loadCrew = () => {
    void listFriends({ data: { clientId: selfId } })
      .then(setCrew)
      .catch(() => {});
  };

  useEffect(() => {
    loadCrew();
    const tmr = window.setInterval(loadCrew, 8000);
    return () => window.clearInterval(tmr);
  }, [selfId]);

  const setStatus = (status: PresenceStatus) => {
    patchSave({ status });
    if (status !== "offline" && save.alerts) void requestAlerts();
  };

  const pingInvite = (friendId: string) => {
    const s = useGame.getState();
    const code = s.room || makeRoomCode();
    if (!s.room) {
      s.setRoom(code);
      s.setJoining(false);
      s.setMode("laststand");
    }
    void inviteFriend({
      data: {
        clientId: selfId,
        name: save.name.trim() || "Climber",
        toId: friendId,
        room: code,
      },
    })
      .then(() => {
        setInvited(friendId);
        s.setScreen("lobby");
      })
      .catch(() => {});
  };

  const buySkin = (i: number) => {
    if (save.ownedSkins.includes(i)) {
      patchSave({ color: i });
      return;
    }
    const price = SKIN_PRICE[i] ?? 0;
    if (save.coins < price) return;
    patchSave({
      coins: save.coins - price,
      ownedSkins: [...save.ownedSkins, i],
      color: i,
    });
  };

  const buyWeapon = (id: WeaponId, price: number) => {
    if (save.ownedWeapons.includes(id)) {
      patchSave({ weapon: id });
      return;
    }
    if (save.coins < price) return;
    patchSave({
      coins: save.coins - price,
      ownedWeapons: [...save.ownedWeapons, id],
      weapon: id,
    });
  };

  return (
    <div data-arcade-root className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3 pb-6">
      <button type="button" className="mb-2 self-start text-sm text-muted" onClick={() => setHub("home")}>
        ← {copy.back}
      </button>

      <div className="rounded-3xl border border-line bg-surface p-4 text-center">
        <div
          className={`mx-auto size-28 overflow-hidden rounded-full border-4 bg-bg ${signedIn ? "border-gold" : "border-ice"}`}
        >
          <PlayerFace
            url={signedIn ? user?.profileImageUrl : null}
            skinId={skin.id}
            className="size-full object-cover"
          />
        </div>
        {signedIn && user?.displayName && (
          <p className="mt-2 text-xs font-bold tracking-wide text-mint">{user.displayName}</p>
        )}
        <input
          value={save.name}
          maxLength={12}
          placeholder={copy.enterName}
          onChange={(e) => patchSave({ name: e.target.value })}
          className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-3 text-center font-display text-2xl text-fg outline-none"
        />
        <p className="mt-1 text-sm text-ice">{rankName(save.bestFloor, lang)}</p>
        <p className="font-display text-2xl text-gold">{save.coins} coins</p>
        <div className="mt-3">
          <StatusPicker value={save.status} onChange={setStatus} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        <Stat n={save.bestFloor} l={copy.best} />
        <Stat n={save.bestScore} l={copy.score} />
        <Stat n={save.bestCombo} l={copy.combo} />
        <Stat n={save.games} l={copy.gamesPlayed} />
      </div>

      <h2 className="mt-5 font-display text-2xl text-ice">{copy.settings}</h2>
      <div className="mt-2 rounded-2xl border border-line bg-surface p-4">
        <FeelTiles
          mute={save.mute}
          shake={save.shake}
          onMute={(muted) => {
            patchSave({ mute: muted });
            applySound(muted);
          }}
          onShake={(on) => {
            patchSave({ shake: on });
            applyShake(on);
          }}
        />
        <div className="mt-4">
          <p className="mb-2 text-center text-[11px] font-bold tracking-wide text-muted uppercase">
            {copy.lang}
          </p>
          <div className="grid grid-cols-2 gap-2" data-testid="lang-toggle">
            {(["he", "en"] as Lang[]).map((code) => {
              const on = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  data-testid={`lang-${code}`}
                  onClick={() => patchSave({ lang: code })}
                  className={`h-12 rounded-xl border-2 font-display text-2xl tracking-wide active:scale-95 ${
                    on ? "border-ice bg-ice/15 text-ice" : "border-line bg-bg text-muted"
                  }`}
                >
                  {code === "he" ? "עב" : "EN"}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <PlaqueBtn
            src={save.alerts ? "/ui/set-alerts-on.jpg" : "/ui/set-alerts-off.jpg"}
            label={save.alerts ? "ALERTS" : "QUIET"}
            tone={save.alerts ? "gold" : "muted"}
            testId="feel-alerts"
            onFire={() => {
              const next = !save.alerts;
              patchSave({ alerts: next });
              if (next) void requestAlerts();
            }}
          />
          <PlaqueBtn
            src="/ui/set-home.jpg"
            label="HOME"
            tone="ice"
            testId="feel-home"
            onFire={() => setOverlay("install")}
          />
          <PlaqueBtn
            src="/ui/set-signout.jpg"
            label="SIGN OUT"
            tone="ice"
            testId="feel-signout"
            onFire={() => setConfirm("out")}
          />
          <PlaqueBtn
            src="/ui/set-delete.jpg"
            label="DELETE"
            tone="rose"
            testId="feel-delete"
            onFire={() => setConfirm("del")}
          />
        </div>
      </div>

      <h2 className="mt-5 font-display text-2xl text-ice">Crew</h2>
      <p className="text-[11px] text-muted">Friends ping you when they come online or send a room invite.</p>
      <div className="mt-2 space-y-1.5">
        {crew.length === 0 && (
          <p className="rounded-2xl border border-line bg-surface px-3 py-3 text-sm text-muted">
            No friends yet. Open the board or a room and tap Add.
          </p>
        )}
        {crew.map((f) => (
          <div key={f.id} className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-2 py-2">
            <img
              src={`/sprites/${SKINS[f.color % SKINS.length]!.id}/idle.png`}
              alt=""
              className="h-10 w-10 object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                <StatusDot status={f.status} />
                {f.name}
              </p>
              <p className="text-[10px] text-muted">{statusLabel(f.status)}</p>
            </div>
            {f.status === "waiting" && (
              <button
                type="button"
                onClick={() => pingInvite(f.id)}
                className="h-8 rounded-lg bg-ice px-2 text-[11px] font-bold text-bg"
              >
                {invited === f.id ? "SENT" : "INVITE"}
              </button>
            )}
            <button
              type="button"
              aria-label="Remove"
              onClick={() => {
                void removeFriend({ data: { clientId: selfId, friendId: f.id } }).then(loadCrew);
              }}
              className="grid size-8 place-items-center text-muted"
            >
              <UserMinus className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <h2 className="mt-5 font-display text-2xl text-ice">Connected</h2>
      <p className="text-[11px] text-muted">Save your score and find friends on the live tower.</p>
      <div className="mt-2 space-y-2 rounded-2xl border border-line bg-surface p-3">
        <LinkRow
          mark={<GoogleMark />}
          name="Google"
          on={signedIn && save.authProvider === "google"}
          soon={false}
        />
        <LinkRow mark={<XMark />} name="X" on={signedIn && save.authProvider === "x"} soon={false} />
        <LinkRow mark={<FacebookMark />} name="Facebook" on={false} soon />
        <LinkRow mark={<TikTokMark />} name="TikTok" on={false} soon />
        <div className="pt-2">
          {isPending ? (
            <div className="h-10 animate-pulse rounded-xl bg-line/40" />
          ) : signedIn ? (
            <p className="text-center text-xs font-bold text-mint">
              Connected as {user?.displayName ?? "you"}
            </p>
          ) : (
            <SocialButtons size="sm" />
          )}
        </div>
      </div>

      <h2 className="mt-5 font-display text-2xl text-ice">Characters</h2>
      <p className="text-[11px] text-muted">Owned — tap to wear. Locked — buy with coins.</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {SKINS.map((sk, i) => {
          const owned = save.ownedSkins.includes(i);
          const price = SKIN_PRICE[i] ?? 0;
          const on = save.color === i;
          return (
            <button
              key={sk.id}
              type="button"
              onClick={() => buySkin(i)}
              className={`rounded-2xl border-2 bg-bg p-1.5 ${on ? "border-ice" : "border-line"} ${owned ? "" : "opacity-70"}`}
            >
              <img src={`/sprites/${sk.id}/idle.png`} alt={sk.name} className="mx-auto h-14 w-auto object-contain" />
              <p className="mt-0.5 text-[10px] font-bold">{sk.name}</p>
              <p className="text-[10px] text-gold">{owned ? (on ? "ON" : "HAVE") : `${price}`}</p>
            </button>
          );
        })}
      </div>

      <h2 className="mt-5 font-display text-2xl text-ice">Weapons</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {WEAPON_SHOP.map((w) => {
          const owned = save.ownedWeapons.includes(w.id);
          const on = save.weapon === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => buyWeapon(w.id, w.price)}
              className={`rounded-2xl border-2 px-3 py-3 text-start ${on ? "border-gold bg-gold/10" : "border-line bg-surface"}`}
            >
              <p className="font-display text-2xl text-gold">{w.name}</p>
              <p className="text-[11px] text-muted">{w.blurb}</p>
              <p className="mt-1 text-xs text-ice">{owned ? (on ? "EQUIPPED" : "OWNED") : `BUY ${w.price}`}</p>
            </button>
          );
        })}
      </div>

      <h2 className="mt-5 font-display text-2xl text-ice">{copy.tabBadges}</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {BADGES.map((b) => {
          const got = save.badges.includes(b.id);
          return (
            <div
              key={b.id}
              className={`rounded-2xl border px-3 py-2 ${got ? "border-gold bg-gold/10" : "border-line bg-surface opacity-50"}`}
            >
              <p className="text-sm font-bold">{badgeName(b, lang)}</p>
              <p className="text-[10px] text-muted">{got ? copy.unlocked : badgeHint(b, lang)}</p>
            </div>
          );
        })}
      </div>

      {confirm === "out" && (
        <ArcadeConfirm
          title="SIGN OUT?"
          body="You'll stay a climber on this device, but the connected account leaves."
          confirm="SIGN OUT"
          busy={busy}
          onNo={() => setConfirm(null)}
          onYes={() => {
            setBusy(true);
            patchSave({ authProvider: "" });
            void signOut().catch(() => {
              setBusy(false);
              setConfirm(null);
            });
          }}
        />
      )}
      {confirm === "del" && (
        <ArcadeConfirm
          title="DELETE?"
          body="Wipes your Rime Rush scores, friends, and account. This cannot be undone."
          confirm="DELETE"
          danger
          busy={busy}
          onNo={() => setConfirm(null)}
          onYes={() => {
            setBusy(true);
            void (async () => {
              try {
                await purgeMyAccount();
              } catch {
                /* local wipe still runs */
              }
              wipeSave();
              await signOut().catch(() => {
                setBusy(false);
                window.location.href = "/";
              });
            })();
          }}
        />
      )}
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-2xl bg-surface py-2">
      <p className="font-display text-2xl leading-none text-gold">{n}</p>
      <p className="text-[10px] text-muted">{l}</p>
    </div>
  );
}

function LinkRow({
  mark,
  name,
  on,
  soon,
}: {
  mark: React.ReactNode;
  name: string;
  on: boolean;
  soon: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-bg px-3 py-2">
      <span className="grid size-8 place-items-center">{mark}</span>
      <span className="flex-1 text-sm font-bold">{name}</span>
      <span className={`text-[10px] font-bold uppercase tracking-wide ${on ? "text-mint" : "text-muted"}`}>
        {soon ? "Soon" : on ? "Connected" : "Off"}
      </span>
    </div>
  );
}
