import { ArrowLeft, Check, Pencil, Plus as PlusIcon, Trash2, X } from "lucide-react";
import { useState } from "react";
import { CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { FRIENDS_DATA } from "../../data/friends";
import { GROUP_COLORS, GROUP_EMOJIS } from "../../data/groups";
import type { Group } from "../../types";
import { AvatarBubble } from "../common/AvatarBubble";

export function ManageGroupsSheet({ groups, onClose, onChange }: {
  groups: Group[];
  onClose: () => void;
  onChange: (g: Group[]) => void;
}) {
  const [localGroups, setLocalGroups]   = useState<Group[]>(groups);
  // groupMembers tracks which friend names are in each group (keyed by group name)
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    groups.forEach((g) => {
      init[g.name] = FRIENDS_DATA.filter((f) => f.groups.includes(g.name)).map((f) => f.name);
    });
    return init;
  });
  const [editing, setEditing]  = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [addMode, setAddMode]  = useState(false);
  const [newName, setNewName]  = useState("");
  const [newEmoji, setNewEmoji] = useState(GROUP_EMOJIS[0]);
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);

  const startEdit = (g: Group) => {
    setEditing(g.name);
    setEditName(g.name);
    setEditEmoji(g.emoji);
    setAddMode(false);
  };

  const saveEdit = () => {
    if (!editing) return;
    const memberCount = (groupMembers[editing] ?? []).length;
    setLocalGroups((prev) =>
      prev.map((g) =>
        g.name === editing
          ? { ...g, name: editName.trim() || g.name, emoji: editEmoji, count: memberCount }
          : g
      )
    );
    // if name changed, re-key the members record
    if (editName.trim() && editName.trim() !== editing) {
      setGroupMembers((prev) => {
        const next = { ...prev, [editName.trim()]: prev[editing] ?? [] };
        delete next[editing];
        return next;
      });
    }
    setEditing(null);
  };

  const toggleMember = (groupName: string, friendName: string) => {
    setGroupMembers((prev) => {
      const current = prev[groupName] ?? [];
      const next = current.includes(friendName)
        ? current.filter((n) => n !== friendName)
        : [...current, friendName];
      return { ...prev, [groupName]: next };
    });
  };

  const deleteGroup = (name: string) => {
    setLocalGroups((prev) => prev.filter((g) => g.name !== name));
    setGroupMembers((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const addGroup = () => {
    if (!newName.trim()) return;
    setLocalGroups((prev) => [...prev, { name: newName.trim(), count: 0, emoji: newEmoji, color: newColor }]);
    setGroupMembers((prev) => ({ ...prev, [newName.trim()]: [] }));
    setNewName("");
    setAddMode(false);
  };

  const saveAll = () => {
    onChange(localGroups);
    onClose();
  };

  const editingGroup = localGroups.find((g) => g.name === editing);

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="rounded-t-3xl overflow-hidden flex flex-col" style={{ background: WHITE, maxHeight: "92%" }}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: CARD }} />
        </div>
        <div className="px-5 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          {editing ? (
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-sm font-extrabold" style={{ color: SKY }}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <h3 className="text-lg font-extrabold" style={{ color: DARK }}>Manage Groups</h3>
          )}
          <button onClick={editing ? () => setEditing(null) : onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: CARD }}>
            <X size={14} style={{ color: MID }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4" style={{ scrollbarWidth: "none" }}>
          {/* ── Full-screen edit panel ── */}
          {editing && editingGroup ? (
            <div>
              {/* Group identity */}
              <div className="rounded-2xl p-3.5 mb-4" style={{ background: editingGroup.color + "12", border: `2px solid ${editingGroup.color}40` }}>
                <p className="text-xs font-extrabold mb-2" style={{ color: MID }}>GROUP IDENTITY</p>
                {/* Emoji picker */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {GROUP_EMOJIS.map((e) => (
                    <button key={e} onClick={() => setEditEmoji(e)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
                      style={{
                        background: editEmoji === e ? editingGroup.color + "30" : WHITE,
                        border: editEmoji === e ? `2px solid ${editingGroup.color}` : "2px solid transparent",
                      }}>
                      {e}
                    </button>
                  ))}
                </div>
                {/* Name input */}
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: WHITE }}>
                  <span className="text-xl">{editEmoji}</span>
                  <input
                    className="flex-1 text-sm font-extrabold bg-transparent outline-none"
                    style={{ color: DARK }}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Group name…"
                  />
                  <Pencil size={13} style={{ color: LIGHT }} />
                </div>
              </div>

              {/* Members section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-extrabold" style={{ color: MID }}>MEMBERS</p>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                    style={{ background: editingGroup.color + "20", color: editingGroup.color }}>
                    {(groupMembers[editing] ?? []).length} selected
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {FRIENDS_DATA.map((f) => {
                    const inGroup = (groupMembers[editing] ?? []).includes(f.name);
                    const scColor = f.status === "available" ? MINT : f.status === "busy" ? CORAL : LIGHT;
                    return (
                      <button
                        key={f.name}
                        onClick={() => toggleMember(editing, f.name)}
                        className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                        style={{
                          background: inGroup ? editingGroup.color + "12" : WHITE,
                          border: inGroup ? `2px solid ${editingGroup.color}50` : "2px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        {/* Avatar with status dot */}
                        <div className="relative flex-shrink-0">
                          <AvatarBubble i={f.avatar} color={f.color} size={40} />
                          <span className="absolute -bottom-0.5 -right-0.5 block w-3 h-3 rounded-full border-2 border-white"
                            style={{ background: scColor }} />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-extrabold leading-tight" style={{ color: DARK }}>{f.name}</p>
                          <p className="text-xs truncate" style={{ color: MID }}>{f.activity}</p>
                          {/* Other groups this person belongs to */}
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {f.groups.filter((g) => g !== editing).map((g) => (
                              <span key={g} className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                                style={{
                                  background: (localGroups.find((lg) => lg.name === g)?.color ?? LIGHT) + "20",
                                  color: localGroups.find((lg) => lg.name === g)?.color ?? LIGHT,
                                }}>
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* Checkbox */}
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            background: inGroup ? editingGroup.color : "transparent",
                            border: inGroup ? `2px solid ${editingGroup.color}` : "2px solid rgba(0,0,0,0.15)",
                          }}>
                          {inGroup && <Check size={13} color={WHITE} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save */}
              <button onClick={saveEdit}
                className="w-full py-3 rounded-2xl text-sm font-extrabold text-white mb-2"
                style={{ background: `linear-gradient(135deg, ${editingGroup.color}, ${LAVENDER})` }}>
                Save Group
              </button>
              <button onClick={() => setEditing(null)}
                className="w-full py-3 rounded-2xl text-sm font-bold" style={{ background: CARD, color: MID }}>
                Cancel
              </button>
            </div>
          ) : (
            /* ── Group list ── */
            <>
              {localGroups.map((g) => (
                <div key={g.name} className="flex items-center gap-3 p-3.5 rounded-2xl mb-2"
                  style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: g.color + "20" }}>{g.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold" style={{ color: DARK }}>{g.name}</p>
                    {/* Member avatar previews */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex -space-x-1.5">
                        {(groupMembers[g.name] ?? []).slice(0, 4).map((name) => {
                          const f = FRIENDS_DATA.find((fd) => fd.name === name);
                          return f ? (
                            <div key={name} className="rounded-full border border-white">
                              <AvatarBubble i={f.avatar} color={f.color} size={20} />
                            </div>
                          ) : null;
                        })}
                      </div>
                      <span className="text-xs" style={{ color: MID }}>
                        {(groupMembers[g.name] ?? []).length || g.count} members
                      </span>
                    </div>
                  </div>
                  <button onClick={() => startEdit(g)} className="p-2 rounded-xl" style={{ background: SKY + "15" }}>
                    <Pencil size={14} style={{ color: SKY }} />
                  </button>
                  <button onClick={() => deleteGroup(g.name)} className="p-2 rounded-xl" style={{ background: CORAL + "15" }}>
                    <Trash2 size={14} style={{ color: CORAL }} />
                  </button>
                </div>
              ))}

              {/* Add group */}
              {addMode ? (
                <div className="rounded-2xl p-3.5 mb-2" style={{ background: CARD, border: `2px solid ${newColor}` }}>
                  <p className="text-xs font-extrabold mb-2" style={{ color: MID }}>NEW GROUP</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {GROUP_EMOJIS.map((e) => (
                      <button key={e} onClick={() => setNewEmoji(e)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                        style={{ background: newEmoji === e ? newColor + "30" : WHITE, border: newEmoji === e ? `2px solid ${newColor}` : "2px solid transparent" }}>
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mb-3">
                    {GROUP_COLORS.map((c) => (
                      <button key={c} onClick={() => setNewColor(c)}
                        className="w-6 h-6 rounded-full flex-shrink-0 transition-all"
                        style={{ background: c, outline: newColor === c ? `2.5px solid ${DARK}` : "none", outlineOffset: 2 }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: WHITE }}>
                    <span className="text-lg">{newEmoji}</span>
                    <input className="flex-1 text-sm font-extrabold bg-transparent outline-none" style={{ color: DARK }}
                      placeholder="Group name…" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addGroup}
                      className="flex-1 py-2 rounded-xl text-sm font-extrabold text-white"
                      style={{ background: newColor }}>Add Group</button>
                    <button onClick={() => setAddMode(false)}
                      className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: WHITE, color: MID }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddMode(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-extrabold mb-2"
                  style={{ background: SKY + "15", color: SKY, border: `2px dashed ${SKY}50` }}>
                  <PlusIcon size={15} /> New Group
                </button>
              )}
            </>
          )}
        </div>

        <div className="px-5 pb-6 pt-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button onClick={saveAll}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white"
            style={{ background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})` }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}