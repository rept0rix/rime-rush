import { useEffect, useState } from "react";

function bigAvatar(url: string): string {
  return url.replace(/=s\d+-c\b/, "=s256-c").replace(/=s\d+\b/, "=s256");
}

export function PlayerFace({
  url,
  skinId,
  className = "h-10 w-10 object-cover",
}: {
  url?: string | null;
  skinId: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [url]);
  if (url && !broken) {
    return (
      <img
        src={bigAvatar(url)}
        alt=""
        referrerPolicy="no-referrer"
        className={`${className} block size-full object-cover`}
        onError={() => setBroken(true)}
      />
    );
  }
  return <img src={`/sprites/${skinId}/idle.png`} alt="" className={`${className} object-contain`} />;
}
