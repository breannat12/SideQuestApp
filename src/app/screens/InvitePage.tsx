import { ArrowLeft, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AvatarBubble } from "../components/common/AvatarBubble";
import { BG, CARD, CORAL, DARK, LIGHT, MID, MINT, SKY } from "../constants/colors";
import { avatarColorFor, initialsFor, useMyFriends } from "../data/friends";
import { addFriends, searchUsersByUsername } from "../data/users";
import type { DirectoryUser } from "../types";

/** Long enough that typing a handle doesn't fire a read per keystroke. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Real handle search over the `users` collection. Adding writes straight to
 * your friend list rather than staging a batch — the Friends tab is watching
 * that collection, so someone you add is on it before you've navigated back.
 */
export function InvitePage({ onBack }: { onBack: () => void }) {
  const { friends } = useMyFriends();

  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState("");
  /** Uids mid-write, so a double tap can't send the same person twice. */
  const [adding, setAdding]       = useState<string[]>([]);
  const [addError, setAddError]   = useState("");

  const term = query.trim().replace(/^@/, "").toLowerCase();

  // The ref makes a slow earlier query lose to a newer one instead of
  // overwriting it when it finally lands.
  const queryId = useRef(0);
  useEffect(() => {
    const id = ++queryId.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await searchUsersByUsername(term);
        if (queryId.current === id) { setResults(found); setSearchError(""); }
      } catch {
        if (queryId.current === id) { setResults([]); setSearchError("Couldn't load users. Check your connection."); }
      } finally {
        if (queryId.current === id) setSearching(false);
      }
    }, term ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(t);
  }, [term]);

  const add = async (user: DirectoryUser) => {
    if (adding.includes(user.uid)) return;
    setAdding((prev) => [...prev, user.uid]);
    setAddError("");
    try {
      await addFriends([user]);
    } catch {
      setAddError("Couldn't add that person. Try again.");
    } finally {
      setAdding((prev) => prev.filter((u) => u !== user.uid));
    }
  };

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
            className="flex-1 text-sm font-extrabold bg-transparent outline-none min-w-0"
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

        {friends.length > 0 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <div className="flex -space-x-2">
              {friends.slice(0, 5).map((f) => (
                <div key={f.uid} className="rounded-full border-2 border-white">
                  <AvatarBubble i={f.avatar} color={f.color} size={26} />
                </div>
              ))}
            </div>
            <span className="text-xs font-extrabold" style={{ color: DARK }}>
              {friends.length} friend{friends.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {addError && (
          <p className="text-xs font-bold mt-2 px-1" style={{ color: CORAL }}>{addError}</p>
        )}
      </div>

      {/* Section label */}
      <div className="px-5 mb-2 flex-shrink-0">
        <p className="text-xs font-extrabold" style={{ color: MID }}>
          {term ? `RESULTS FOR "@${term}"` : "SUGGESTED PEOPLE"}
        </p>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
        {searchError && (
          <p className="text-xs font-bold px-1 py-2" style={{ color: CORAL }}>{searchError}</p>
        )}

        {searching && results.length === 0 ? (
          <p className="text-xs font-bold px-1 py-2" style={{ color: LIGHT }}>Searching…</p>
        ) : results.length === 0 && !searchError ? (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-extrabold" style={{ color: DARK }}>
              {term ? `No users found for "@${term}"` : "Nobody else has signed up yet"}
            </p>
            <p className="text-xs" style={{ color: MID }}>
              {term
                ? "Check the spelling — handles are case-insensitive."
                : "Invite a friend to sign up and they'll turn up here."}
            </p>
          </div>
        ) : (
          results.map((u) => {
            const isFriend = friends.some((f) => f.uid === u.uid);
            const busy     = adding.includes(u.uid);
            return (
              <div key={u.uid} className="flex items-center gap-3 py-3"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <AvatarBubble i={initialsFor(u.name || u.username)} color={avatarColorFor(u.uid)} size={46} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-extrabold truncate" style={{ color: DARK }}>{u.name || u.username}</p>
                    {isFriend && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-bold flex-shrink-0"
                        style={{ background: MINT + "20", color: MINT }}>Friend</span>
                    )}
                  </div>
                  <p className="text-xs font-bold truncate" style={{ color: SKY }}>@{u.username}</p>
                </div>
                {isFriend ? (
                  <div className="px-3 py-1.5 rounded-xl flex items-center gap-1 text-xs font-extrabold flex-shrink-0"
                    style={{ background: CARD, color: MID }}>
                    <Check size={12} /> Added
                  </div>
                ) : (
                  <button onClick={() => add(u)} disabled={busy}
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex-shrink-0"
                    style={{ background: busy ? CARD : SKY + "18", color: busy ? MID : SKY }}>
                    {busy ? "Adding…" : "+ Add"}
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
