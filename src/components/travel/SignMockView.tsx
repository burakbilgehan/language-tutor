import type { CSSProperties } from "react";
import type { SignMock } from "@/lib/travel/types";

// T-100: Japanese signs drawn in their REAL-WORLD colours: green 非常口 and
// evacuation signs, yellow exits and caution signs, red prohibitions, navy /
// red bath curtains. Sign colour is content here (you learn to spot a sign by
// its colour before you can read it), so the app's design-system palette
// rules (no green, vermilion for actions) deliberately do NOT apply inside
// this component. Colours are identical in light and dark theme because they
// depict physical objects.

const C = {
  green: "#00a051", // 非常口, evacuation (JIS safety green)
  yellow: "#ffd400", // station exits, caution
  red: "#d7000f", // prohibition
  charcoal: "#262626", // station directional signs
  white: "#ffffff",
  black: "#111111",
  navy: "#1f3a68", // indigo noren, 男湯
  noRed: "#c1272d", // 女湯 noren
  wood: "#c9a26b", // shop plaque
  woodInk: "#2b1a0b",
  jrGreen: "#2e9e44", // station-board line stripe
};

const ARROW: Record<NonNullable<SignMock["arrow"]>, string> = {
  left: "←",
  right: "→",
  up: "↑",
  down: "↓",
};

const has = (s: string, ...needles: string[]) => needles.some((n) => s.includes(n));
const isEvacuation = (s: string) => has(s, "非常口", "避難");
const isCaution = (s: string) => has(s, "注意", "危険");

function Arrow({ dir }: { dir?: SignMock["arrow"] }) {
  if (!dir) return null;
  return (
    <span aria-hidden className="text-xl font-bold leading-none sm:text-2xl">
      {ARROW[dir]}
    </span>
  );
}

/** Running figure, as on the green 非常口 sign. */
function Runner() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden fill="currentColor">
      <circle cx="15" cy="4" r="2.2" />
      <path d="M13.5 7.2 9 9.5l-1.8 4 1.8.8 1.4-3 1.6-.7-1.5 5.2-3.7 4.4 1.6 1.3 4.1-4.8.8-2.4 2.3 2.6V22h2v-6.4l-2.6-3 .8-2.9 1.3 2.1h3.7v-2h-2.6z" />
    </svg>
  );
}

function NoSign() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke={C.red} strokeWidth="2.6" />
      <line x1="5" y1="19" x2="19" y2="5" stroke={C.red} strokeWidth="2.6" />
    </svg>
  );
}

function CautionSign() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden>
      <path d="M12 2 23 21H1z" fill={C.black} />
      <path d="M12 6.5 19.4 19H4.6z" fill={C.yellow} />
      <rect x="11" y="10" width="2" height="5" fill={C.black} />
      <rect x="11" y="16" width="2" height="2" fill={C.black} />
    </svg>
  );
}

const panel =
  "flex min-h-24 items-center justify-center gap-2 rounded-lg px-2 py-3 shadow-cozy";

function TwoLine({ jp, sub }: { jp: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <span lang="ja" className="font-bold tracking-wide text-lg leading-snug sm:text-xl">
        {jp}
      </span>
      {sub && <span className="text-xs font-semibold opacity-85">{sub}</span>}
    </div>
  );
}

function Directional({
  sign,
  style,
  icon,
}: {
  sign: SignMock;
  style: CSSProperties;
  icon?: React.ReactNode;
}) {
  return (
    <div className={panel} style={style}>
      {icon}
      {sign.arrow === "left" && <Arrow dir="left" />}
      <TwoLine jp={sign.jp} sub={sign.sub} />
      {sign.arrow && sign.arrow !== "left" && <Arrow dir={sign.arrow} />}
    </div>
  );
}

export function SignMockView({ sign }: { sign: SignMock }) {
  const evac = isEvacuation(sign.jp);

  switch (sign.style) {
    case "station": {
      // sub: "きょうと / Kyōto" → kana above, romaji below.
      const [kana, romaji] = (sign.sub ?? "").split(" / ");
      return (
        <div
          className="flex min-h-24 flex-col items-center justify-center overflow-hidden rounded-lg border shadow-cozy"
          style={{ background: C.white, color: C.black, borderColor: "#d0d0d0" }}
        >
          <div className="flex w-full flex-1 flex-col items-center justify-center px-3 pt-2">
            {kana && (
              <span lang="ja" className="text-xs" style={{ color: "#555" }}>
                {kana}
              </span>
            )}
            <span lang="ja" className="whitespace-nowrap text-xl font-bold tracking-widest sm:text-2xl">
              {sign.jp}
            </span>
            {romaji && (
              <span className="text-xs" style={{ color: "#555" }}>
                {romaji}
              </span>
            )}
          </div>
          <div className="mt-2 h-2.5 w-full" style={{ background: C.jrGreen }} />
        </div>
      );
    }
    case "exit":
      return evac ? (
        <Directional
          sign={sign}
          style={{ background: C.green, color: C.white }}
          icon={<Runner />}
        />
      ) : (
        <Directional sign={sign} style={{ background: C.yellow, color: C.black }} />
      );
    case "info":
      return evac ? (
        <Directional
          sign={sign}
          style={{ background: C.green, color: C.white }}
          icon={<Runner />}
        />
      ) : (
        <Directional sign={sign} style={{ background: C.charcoal, color: C.white }} />
      );
    case "warning":
      return isCaution(sign.jp) ? (
        <div className={panel} style={{ background: C.yellow, color: C.black }}>
          <CautionSign />
          <TwoLine jp={sign.jp} sub={sign.sub} />
        </div>
      ) : (
        <div
          className={`${panel} border-4`}
          style={{ background: C.white, color: C.red, borderColor: C.red }}
        >
          <NoSign />
          <TwoLine jp={sign.jp} sub={sign.sub} />
        </div>
      );
    case "shop": {
      // Hanging wooden plaque; short texts are written vertically like the
      // real 営業中 / 準備中 boards, long ones (hours, notices) horizontally.
      const vertical = [...sign.jp].length <= 5;
      return (
        <div className="flex min-h-24 items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="h-3 w-px" style={{ background: C.woodInk }} />
            <div
              lang="ja"
              className="rounded-md border-2 px-2 py-3 text-lg font-bold shadow-cozy sm:text-xl"
              style={{
                background: C.wood,
                color: C.woodInk,
                borderColor: "#8a6a3f",
                writingMode: vertical ? "vertical-rl" : undefined,
              }}
            >
              {sign.jp}
            </div>
            {sign.sub && <span className="mt-1 text-xs text-ink-soft">{sign.sub}</span>}
          </div>
        </div>
      );
    }
    case "noren": {
      // Split curtain; 女湯 is red, everything else the classic indigo.
      const color = sign.jp.includes("女") ? C.noRed : C.navy;
      const chars = Array.from(sign.jp);
      const panels = Math.min(Math.max(chars.length, 2), 4);
      const per = Math.ceil(chars.length / panels);
      return (
        <div className="flex min-h-24 flex-col items-center justify-start">
          <div className="h-2 w-full max-w-40 rounded-full" style={{ background: "#6b4a2b" }} />
          <div className="relative flex w-full max-w-40 gap-0.5">
            {Array.from({ length: panels }, (_, i) => (
              <div
                key={i}
                lang="ja"
                className="flex h-20 flex-1 items-center justify-center rounded-b-md text-2xl font-bold"
                style={{ background: color, color: C.white }}
              >
                {chars.length > 1 && chars.slice(i * per, (i + 1) * per).join("")}
              </div>
            ))}
            {chars.length === 1 && (
              // A single character (ゆ) is dyed across the slit, centred.
              <span
                lang="ja"
                className="absolute inset-0 flex items-center justify-center text-4xl font-bold"
                style={{ color: C.white }}
              >
                {sign.jp}
              </span>
            )}
          </div>
          {sign.sub && <span className="mt-1 text-xs text-ink-soft">{sign.sub}</span>}
        </div>
      );
    }
    case "ticket":
      return (
        <div
          className="flex min-h-24 flex-col overflow-hidden rounded-md border-2 border-dashed shadow-cozy"
          style={{ background: "#fffdf5", color: C.black, borderColor: "#bbb" }}
        >
          <div className="h-2" style={{ background: "#e9b949" }} />
          <div className="flex flex-1 flex-col items-center justify-center px-3 py-2 text-center">
            <span lang="ja" className="text-lg font-bold sm:text-xl">
              {sign.jp}
            </span>
            {sign.sub && (
              <span className="text-xs" style={{ color: "#555" }}>
                {sign.sub}
              </span>
            )}
          </div>
        </div>
      );
  }
}

/** Sign plus its meaning caption. */
export function SignCard({ sign, ui }: { sign: SignMock; ui: "tr" | "en" }) {
  return (
    <figure className="flex flex-col gap-2">
      <SignMockView sign={sign} />
      <figcaption className="text-center text-sm text-ink-soft">
        {sign.meaning[ui]}
      </figcaption>
    </figure>
  );
}
