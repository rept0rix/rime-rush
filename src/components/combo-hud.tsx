interface Props {
  combo: number;
  comboKey: number;
  yell: string;
  gain: number;
  story: string | null;
}

export function ComboHud({ combo, comboKey, yell, gain, story }: Props) {
  const shout =
    yell ||
    (combo >= 32
      ? "RIME RUSH!"
      : combo >= 14
        ? "MASTER"
        : combo >= 8
          ? "COMBO!!"
          : combo >= 4
            ? "COMBO!!"
            : combo >= 2
              ? `X${combo}`
              : "");
  const size = combo >= 24 ? 88 : combo >= 14 ? 78 : combo >= 8 ? 72 : combo >= 4 ? 60 : 52;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {combo >= 2 && (
        <div className="absolute inset-x-0 top-[18%] flex flex-col items-center">
          <p
            key={`y-${comboKey}`}
            className="combo-burst font-display leading-none text-gold"
            style={{
              fontSize: size,
              textShadow:
                combo >= 8
                  ? "0 0 18px rgba(255,211,106,0.85), 0 4px 0 #5a3a10"
                  : "0 2px 0 #5a3a10",
              letterSpacing: combo >= 8 ? "0.06em" : undefined,
            }}
          >
            {shout}
          </p>
          {gain > 0 ? (
            <p key={`g-${comboKey}`} className="combo-gain font-display text-2xl leading-none text-mint">
              +{gain}
            </p>
          ) : null}
        </div>
      )}

      {story && combo < 2 && (
        <div className="absolute inset-x-0 top-[26%] flex justify-center px-8">
          <p className="max-w-[280px] rounded-md bg-[#140c08]/60 px-2 py-0.5 text-center text-[10px] font-bold tracking-wide text-ice/80">
            {story}
          </p>
        </div>
      )}
    </div>
  );
}
