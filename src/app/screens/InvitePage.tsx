import { ArrowLeft, Check, X } from "lucide-react";
import { useState } from "react";
import { AvatarBubble } from "../components/common/AvatarBubble";
import { BG, CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, PEACH, SKY, WHITE } from "../constants/colors";

const ALL_USERS = [
  { handle: "@miakawaii",   name: "Mia K.",   avatar: "MK", color: PEACH,    bio: "Coffee addict ☕ · College",    mutual: 4, alreadyFriend: true  },
  { handle: "@rajsharma",   name: "Raj S.",   avatar: "RS", color: CORAL,    bio: "Pizza & late nights 🍕",        mutual: 3, alreadyFriend: true  },
  { handle: "@lilytran",    name: "Lily T.",  avatar: "LT", color: SKY,      bio: "Study grind 📚 · SF",           mutual: 6, alreadyFriend: true  },
  { handle: "@colemoore",   name: "Cole M.",  avatar: "CM", color: MINT,     bio: "Gym rat 🏋️ · Mission",         mutual: 2, alreadyFriend: true  },
  { handle: "@jadenpark",   name: "Jaden P.", avatar: "JP", color: LAVENDER, bio: "Music & coffee ☕ · Berkeley",  mutual: 5, alreadyFriend: false },
  { handle: "@sofialuiz",   name: "Sofia L.", avatar: "SL", color: CORAL,    bio: "Film nerd 🎬 · Oakland",        mutual: 2, alreadyFriend: false },
  { handle: "@marcusw",     name: "Marcus W.",avatar: "MW", color: MINT,     bio: "Basketball + burritos 🌯",      mutual: 1, alreadyFriend: false },
  { handle: "@priyanka_r",  name: "Priya R.", avatar: "PR", color: PEACH,    bio: "Foodie & hiker 🥗 · SoMa",     mutual: 3, alreadyFriend: false },
  { handle: "@tomaszewski", name: "Tom A.",   avatar: "TA", color: SKY,      bio: "Gamer & dev 🎮 · SOMA",        mutual: 0, alreadyFriend: false },
];

export function InvitePage({ onBack }: { onBack: () => void }) {
  const [query, setQuery]         = useState("");
  const [added, setAdded]         = useState<string[]>([]);

  const trimmed = query.trim().replace(/^@/, "").toLowerCase();

  // Results: show matches when user has typed, else show suggestions (non-friends)
  const results = trimmed
    ? ALL_USERS.filter((u) =>
        u.handle.replace("@", "").includes(trimmed) ||
        u.name.toLowerCase().includes(trimmed)
      )
    : ALL_USERS.filter((u) => !u.alreadyFriend);

  const handleAdd = (handle: string) =>
    setAdded((prev) => prev.includes(handle) ? prev.filter((h) => h !== handle) : [...prev, handle]);

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: CARD }}>
          <ArrowLeft size={17} style={{ color: DARK }} />
        </button>
        <div>
          <h2 className="text-lg font-extrabold" style={{ color: DARK }}>Find Friends</h2>
          <p className="text-xs" style={{ color: MID }}>Search by @username to add people</p>
        </div>
      </div>

      {/* Search input */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
          style={{ background: CARD, border: `1.5px solid ${query ? SKY + "60" : "rgba(0,0,0,0.06)"}` }}>
          <span className="text-base font-extrabold" style={{ color: query ? SKY : LIGHT }}>@</span>
          <input
            autoFocus
            className="flex-1 text-sm font-extrabold bg-transparent outline-none"
            style={{ color: DARK }}
            placeholder="username"
            value={query.replace(/^@/, "")}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={15} style={{ color: LIGHT }} />
            </button>
          )}
        </div>

        {/* Added count badge */}
        {added.length > 0 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <div className="flex -space-x-2">
              {added.slice(0, 5).map((h) => {
                const u = ALL_USERS.find((x) => x.handle === h);
                return u ? (
                  <div key={h} className="rounded-full border-2 border-white">
                    <AvatarBubble i={u.avatar} color={u.color} size={26} />
                  </div>
                ) : null;
              })}
            </div>
            <span className="text-xs font-extrabold" style={{ color: DARK }}>
              {added.length} friend{added.length > 1 ? "s" : ""} selected
            </span>
            <button className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white"
              style={{ background: MINT }}>
              Send Invite{added.length > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>

      {/* Section label */}
      <div className="px-5 mb-2 flex-shrink-0">
        <p className="text-xs font-extrabold" style={{ color: MID }}>
          {trimmed ? `RESULTS FOR "@${trimmed}"` : "SUGGESTED PEOPLE"}
        </p>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
        {results.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-extrabold" style={{ color: DARK }}>No users found for "@{trimmed}"</p>
            <p className="text-xs" style={{ color: MID }}>Check the spelling — handles are case-insensitive.</p>
          </div>
        ) : (
          results.map((u) => {
            const isAdded  = added.includes(u.handle);
            const isFriend = u.alreadyFriend;
            return (
              <div key={u.handle} className="flex items-center gap-3 py-3"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <AvatarBubble i={u.avatar} color={u.color} size={46} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-extrabold" style={{ color: DARK }}>{u.name}</p>
                    {isFriend && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                        style={{ background: MINT + "20", color: MINT }}>Friend</span>
                    )}
                  </div>
                  <p className="text-xs font-bold" style={{ color: SKY }}>{u.handle}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: MID }}>{u.bio}</p>
                  {u.mutual > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: LIGHT }}>
                      {u.mutual} mutual friend{u.mutual > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                {isFriend ? (
                  <div className="px-3 py-1.5 rounded-xl flex items-center gap-1 text-xs font-extrabold"
                    style={{ background: CARD, color: MID }}>
                    <Check size={12} /> Added
                  </div>
                ) : (
                  <button onClick={() => handleAdd(u.handle)}
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all"
                    style={{
                      background: isAdded ? MINT : SKY + "18",
                      color: isAdded ? WHITE : SKY,
                    }}>
                    {isAdded ? "✓ Added" : "+ Add"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}