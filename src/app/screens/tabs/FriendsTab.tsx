import { Pencil, Plus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { AvatarBubble } from "../../components/common/AvatarBubble";
import { Divider } from "../../components/common/Divider";
import { BG, CARD, CORAL, DARK, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { useMyFriends } from "../../data/friends";
import { useMyGroups } from "../../data/groups";
import type { Group } from "../../types";
import { GroupEditorPage } from "../GroupEditorPage";
import { InvitePage } from "../InvitePage";

export function FriendsTab() {
  const { friends, loading: loadingFriends, error: friendsError } = useMyFriends();
  const { groups, error: groupsError } = useMyGroups();

  const [activeId, setActiveId]   = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  /** A Group edits it, "new" creates one, null means neither is open. */
  const [editing, setEditing]     = useState<Group | "new" | null>(null);

  // A group deleted on another device shouldn't leave the list filtered by it.
  const activeGroup = groups.find((g) => g.id === activeId) ?? null;

  const visible = activeGroup
    ? friends.filter((f) => activeGroup.memberUids.includes(f.uid))
    : friends;

  // Full-panel replacements, same as Invite
  if (inviteOpen) return <InvitePage onBack={() => setInviteOpen(false)} />;
  if (editing) {
    return (
      <GroupEditorPage
        group={editing === "new" ? undefined : editing}
        onBack={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full relative" style={{ background: BG }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-extrabold" style={{ color: DARK }}>Friends</h1>
        <button onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold"
          style={{ background: SKY + "20", color: SKY }}>
          <UserPlus size={13} /> Invite
        </button>
      </div>

      {/* Groups */}
      <div className="px-5 mb-3 flex-shrink-0">
        <p className="text-xs font-extrabold mb-2" style={{ color: MID }}>GROUPS</p>

        {groupsError && (
          <p className="text-xs font-bold mb-2" style={{ color: CORAL }}>{groupsError}</p>
        )}

        {groups.length === 0 ? (
          /* Nothing to filter by yet, so the invitation takes the whole row. */
          <button onClick={() => setEditing("new")}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all"
            style={{ border: `2px dashed ${SKY}80`, background: SKY + "0C" }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: SKY + "20" }}>
              <Plus size={18} strokeWidth={3} style={{ color: SKY }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-extrabold" style={{ color: DARK }}>Create group</p>
              <p className="text-xs" style={{ color: MID }}>
                Bundle friends together to plan with them faster
              </p>
            </div>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {groups.map((g) => {
              const active = activeId === g.id;
              return (
                <button key={g.id} onClick={() => setActiveId(active ? null : g.id)}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all"
                  style={{
                    background: active ? g.color + "22" : CARD,
                    border: active ? `2px solid ${g.color}` : "2px solid transparent",
                  }}>
                  <span className="text-xl">{g.emoji}</span>
                  <span className="text-xs font-extrabold leading-tight text-center truncate w-full"
                    style={{ color: active ? DARK : MID }}>
                    {g.name}
                  </span>
                  <span className="text-xs" style={{ color: LIGHT }}>{g.memberUids.length}</span>
                </button>
              );
            })}

            {/* Same dotted card, sized to sit in the grid beside the groups. */}
            <button onClick={() => setEditing("new")}
              className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl transition-all"
              style={{ border: `2px dashed ${SKY}80`, background: SKY + "0C" }}>
              <Plus size={18} strokeWidth={3} style={{ color: SKY }} />
              <span className="text-xs font-extrabold leading-tight text-center" style={{ color: SKY }}>
                Create group
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Section divider — carries the edit affordance for the active group */}
      <div className="px-5 mb-3 flex-shrink-0">
        <Divider label={activeGroup
          ? `${activeGroup.name} · ${visible.length} of ${activeGroup.memberUids.length}`
          : `All Friends · ${friends.length}`} />
        {activeGroup && (
          <div className="flex justify-end mt-1.5">
            <button onClick={() => setEditing(activeGroup)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold"
              style={{ background: activeGroup.color + "20", color: activeGroup.color }}>
              <Pencil size={11} /> Edit group
            </button>
          </div>
        )}
      </div>

      {/* Friends list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
        {friendsError && (
          <p className="text-xs font-bold px-1 py-2" style={{ color: CORAL }}>{friendsError}</p>
        )}

        {loadingFriends && !friends.length && (
          <p className="text-xs font-bold px-1 py-2" style={{ color: LIGHT }}>Loading your friends…</p>
        )}

        {!loadingFriends && friends.length === 0 && (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2.5"
              style={{ background: SKY + "20" }}>
              <Users size={20} style={{ color: SKY }} />
            </div>
            <p className="text-sm font-extrabold mb-1" style={{ color: DARK }}>No friends yet</p>
            <p className="text-xs mb-4" style={{ color: MID }}>
              Find people by their username and they'll show up here.
            </p>
            <button onClick={() => setInviteOpen(true)}
              className="px-4 py-2.5 rounded-2xl text-sm font-extrabold text-white"
              style={{ background: `linear-gradient(135deg, ${MINT}, ${SKY})` }}>
              Find friends
            </button>
          </div>
        )}

        {/* An emptied group reads as a mistake unless it says so. */}
        {activeGroup && friends.length > 0 && visible.length === 0 && (
          <div className="rounded-2xl p-4 text-center"
            style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
            <p className="text-sm font-extrabold mb-0.5" style={{ color: DARK }}>Nobody in here yet</p>
            <p className="text-xs" style={{ color: MID }}>Tap Edit group to add friends to {activeGroup.name}.</p>
          </div>
        )}

        {visible.map((f) => {
          // Chips for every group this person is in — the reverse of the filter.
          const memberOf = groups.filter((g) => g.memberUids.includes(f.uid));
          return (
            <div key={f.uid} className="flex items-center gap-3 p-3 rounded-2xl mb-2"
              style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
              <AvatarBubble i={f.avatar} color={f.color} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold" style={{ color: DARK }}>{f.name}</p>
                {f.username && <p className="text-xs truncate" style={{ color: MID }}>@{f.username}</p>}
                {memberOf.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {memberOf.map((g) => (
                      <span key={g.id} className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                        style={{ background: g.color + "20", color: g.color }}>
                        {g.emoji} {g.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button className="text-xs font-extrabold px-2.5 py-1 rounded-xl flex-shrink-0"
                style={{ background: MINT + "20", color: MINT }}>Ping! 👋</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
