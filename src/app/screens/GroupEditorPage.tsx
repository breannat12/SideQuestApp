import { ArrowLeft, Check, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { AvatarBubble } from "../components/common/AvatarBubble";
import { BG, CARD, CORAL, DARK, LIGHT, MID, MINT, SKY, WHITE } from "../constants/colors";
import { useMyFriends } from "../data/friends";
import {
  createGroup, deleteGroup, GROUP_COLORS, GROUP_EMOJIS, GROUP_NAME_MAX,
  groupErrorMessage, updateGroup,
} from "../data/groups";
import type { Group } from "../types";

/**
 * Create or edit one group. Full-panel rather than a sheet: picking people out
 * of a friend list wants the whole screen, the same way Invite does.
 *
 * `group` absent means a new one; passing an existing group turns this into an
 * editor, down to the delete button.
 */
export function GroupEditorPage({ group, onBack }: {
  group?: Group;
  onBack: () => void;
}) {
  const { friends, loading, error: friendsError } = useMyFriends();

  const [name, setName]     = useState(group?.name ?? "");
  const [emoji, setEmoji]   = useState(group?.emoji ?? GROUP_EMOJIS[0]);
  const [color, setColor]   = useState(group?.color ?? GROUP_COLORS[0]);
  const [members, setMembers] = useState<string[]>(group?.memberUids ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cleanName = name.trim();
  const editing   = Boolean(group);

  const toggle = (uid: string) =>
    setMembers((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]));

  const save = async () => {
    if (!cleanName || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const next = { name: cleanName, emoji, color, memberUids: members };
      if (group) await updateGroup(group.id, next);
      else       await createGroup(next);
      onBack();
    } catch (err) {
      setSaveError(groupErrorMessage(err));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!group || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await deleteGroup(group.id);
      onBack();
    } catch (err) {
      setSaveError(groupErrorMessage(err));
      setSaving(false);
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
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold leading-tight" style={{ color: DARK }}>
            {editing ? "Edit group" : "New group"}
          </h1>
          <p className="text-xs font-bold" style={{ color: MID }}>
            {members.length} {members.length === 1 ? "friend" : "friends"} in this group
          </p>
        </div>
        {editing && (
          <button onClick={() => setConfirmDelete(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: CORAL + "20" }} aria-label="Delete group">
            <Trash2 size={16} style={{ color: CORAL }} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-4" style={{ scrollbarWidth: "none" }}>
        {/* Identity: emoji, colour, name — previewed as the card it becomes. */}
        <div className="rounded-2xl p-3.5 mb-5"
          style={{ background: color + "12", border: `2px solid ${color}40` }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3" style={{ background: WHITE }}>
            <span className="text-2xl">{emoji}</span>
            <input
              autoFocus
              className="flex-1 text-sm font-extrabold bg-transparent outline-none min-w-0"
              style={{ color: DARK }}
              placeholder="Name this group…"
              maxLength={GROUP_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {name && (
              <button onClick={() => setName("")} className="flex-shrink-0" aria-label="Clear name">
                <X size={14} style={{ color: LIGHT }} />
              </button>
            )}
          </div>

          <p className="text-xs font-extrabold mb-1.5" style={{ color: MID }}>EMOJI</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {GROUP_EMOJIS.map((e) => (
              <button key={e} onClick={() => setEmoji(e)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
                style={{
                  background: emoji === e ? color + "30" : WHITE,
                  border: emoji === e ? `2px solid ${color}` : "2px solid transparent",
                }}>
                {e}
              </button>
            ))}
          </div>

          <p className="text-xs font-extrabold mb-1.5" style={{ color: MID }}>COLOR</p>
          <div className="flex flex-wrap gap-2">
            {GROUP_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full flex-shrink-0 transition-all"
                style={{ background: c, outline: color === c ? `2.5px solid ${DARK}` : "none", outlineOffset: 2 }}
                aria-label={`Use colour ${c}`} />
            ))}
          </div>
        </div>

        {/* Members */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-extrabold" style={{ color: MID }}>ADD FRIENDS</p>
          {members.length > 0 && (
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full"
              style={{ background: color + "20", color }}>{members.length} selected</span>
          )}
        </div>

        {friendsError && (
          <p className="text-xs font-bold px-1 py-2" style={{ color: CORAL }}>{friendsError}</p>
        )}

        {loading && !friends.length ? (
          <p className="text-xs font-bold px-1 py-2" style={{ color: LIGHT }}>Loading your friends…</p>
        ) : !friends.length ? (
          <div className="rounded-2xl p-4 text-center mb-2"
            style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-2"
              style={{ background: SKY + "20" }}>
              <UserPlus size={18} style={{ color: SKY }} />
            </div>
            <p className="text-sm font-extrabold mb-0.5" style={{ color: DARK }}>No friends yet</p>
            <p className="text-xs" style={{ color: MID }}>
              Add people from the Invite tab and they'll show up here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-2">
            {friends.map((f) => {
              const on = members.includes(f.uid);
              return (
                <button key={f.uid} onClick={() => toggle(f.uid)}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                  style={{
                    background: on ? color + "12" : WHITE,
                    border: on ? `2px solid ${color}50` : "2px solid rgba(0,0,0,0.06)",
                  }}>
                  <AvatarBubble i={f.avatar} color={f.color} size={40} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-extrabold leading-tight" style={{ color: DARK }}>{f.name}</p>
                    {f.username && <p className="text-xs truncate" style={{ color: MID }}>@{f.username}</p>}
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: on ? color : "transparent",
                      border: on ? `2px solid ${color}` : "2px solid rgba(0,0,0,0.15)",
                    }}>
                    {on && <Check size={13} color={WHITE} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="px-5 pb-4 pt-2 flex-shrink-0">
        {saveError && (
          <p className="text-xs font-bold text-center mb-2 px-1" style={{ color: CORAL }}>{saveError}</p>
        )}
        <button
          disabled={!cleanName || saving}
          onClick={save}
          className="w-full py-3.5 rounded-2xl font-extrabold text-white"
          style={{ background: cleanName && !saving ? `linear-gradient(135deg, ${MINT}, ${SKY})` : LIGHT }}>
          {saving ? "Saving…" : !cleanName ? "Name your group to continue" : editing ? "Save changes" : "Create group"}
        </button>
      </div>

      {/* Deleting takes the group away from every screen at once, so it asks. */}
      {confirmDelete && group && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ background: "rgba(0,0,0,0.42)" }}
          onClick={() => setConfirmDelete(false)}>
          <div className="w-full rounded-3xl p-5" style={{ maxWidth: 320, background: WHITE }}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-extrabold mb-1" style={{ color: DARK }}>
              Delete {group.emoji} {group.name}?
            </p>
            <p className="text-xs mb-4" style={{ color: MID }}>
              The group goes away for good. Your friends stay in your friends list.
            </p>
            <button onClick={remove} disabled={saving}
              className="w-full py-3 rounded-2xl font-extrabold text-white mb-2"
              style={{ background: CORAL }}>
              {saving ? "Deleting…" : "Delete group"}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="w-full py-3 rounded-2xl font-bold" style={{ background: CARD, color: MID }}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
