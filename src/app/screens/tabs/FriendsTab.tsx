import { ChevronRight, Settings, UserPlus } from "lucide-react";
import { useState } from "react";
import { AvatarBubble } from "../../components/common/AvatarBubble";
import { Divider } from "../../components/common/Divider";
import { StatusDot } from "../../components/common/StatusDot";
import { ManageGroupsSheet } from "../../components/sheets/ManageGroupsSheet";
import { BG, CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { FRIENDS_DATA } from "../../data/friends";
import { INITIAL_GROUPS } from "../../data/groups";
import type { Group } from "../../types";
import { InvitePage } from "../InvitePage";

export function FriendsTab() {
  const [groups, setGroups]           = useState<Group[]>(INITIAL_GROUPS);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [manageOpen, setManageOpen]   = useState(false);
  const [inviteOpen, setInviteOpen]   = useState(false);
  // busy and DND start collapsed
  const [collapsed, setCollapsed]     = useState<Record<string, boolean>>({ busy: true, dnd: true });

  const toggleCollapse = (status: string) =>
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));

  const scColor = (s: string) => s === "available" ? MINT : s === "busy" ? CORAL : LIGHT;
  const scLabel = (s: string) => s === "available" ? "Free" : s === "busy" ? "Busy" : "DND";

  const visible = activeGroup
    ? FRIENDS_DATA.filter((f) => f.groups.includes(activeGroup))
    : FRIENDS_DATA;

  // Show invite page as a full-panel replacement
  if (inviteOpen) return <InvitePage onBack={() => setInviteOpen(false)} />;

  return (
    <div className="flex flex-col h-full relative" style={{ background: BG }}>
      {manageOpen && (
        <ManageGroupsSheet
          groups={groups}
          onClose={() => setManageOpen(false)}
          onChange={setGroups}
        />
      )}

      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-extrabold" style={{ color: DARK }}>Friends</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setManageOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold"
            style={{ background: LAVENDER + "20", color: LAVENDER }}>
            <Settings size={13} /> Manage
          </button>
          <button onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold"
            style={{ background: SKY + "20", color: SKY }}>
            <UserPlus size={13} /> Invite
          </button>
        </div>
      </div>

      {/* Groups grid */}
      <div className="px-5 mb-3 flex-shrink-0">
        <p className="text-xs font-extrabold mb-2" style={{ color: MID }}>GROUPS</p>
        <div className="grid grid-cols-4 gap-2">
          {groups.map((g) => {
            const active = activeGroup === g.name;
            return (
              <button key={g.name} onClick={() => setActiveGroup(active ? null : g.name)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all"
                style={{
                  background: active ? g.color + "22" : CARD,
                  border: active ? `2px solid ${g.color}` : "2px solid transparent",
                }}>
                <span className="text-xl">{g.emoji}</span>
                <span className="text-xs font-extrabold leading-tight text-center" style={{ color: active ? DARK : MID }}>
                  {g.name}
                </span>
                <span className="text-xs" style={{ color: LIGHT }}>{g.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section divider */}
      <div className="px-5 mb-3 flex-shrink-0">
        <Divider label={activeGroup ? `${activeGroup} · ${visible.length} friends` : `All Friends · ${visible.length}`} />
      </div>

      {/* Friends list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
        {["available", "busy", "dnd"].map((status) => {
          const group = visible.filter((f) => f.status === status);
          if (!group.length) return null;
          const isCollapsible = status !== "available";
          const isCollapsed   = isCollapsible && collapsed[status];
          const emoji = status === "available" ? "🟢" : status === "busy" ? "🔴" : "🔕";
          const label = status === "available" ? "Free now" : status === "busy" ? "Busy" : "Do not disturb";

          return (
            <div key={status} className="mb-4">
              {/* Section header — clickable for busy/dnd */}
              <button
                onClick={() => isCollapsible && toggleCollapse(status)}
                className="w-full flex items-center justify-between mb-2 px-0.5"
                style={{ cursor: isCollapsible ? "pointer" : "default" }}
              >
                <p className="text-xs font-extrabold tracking-wide uppercase flex items-center gap-1.5" style={{ color: MID }}>
                  {emoji} {label} <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: scColor(status) + "18", color: scColor(status) }}>{group.length}</span>
                </p>
                {isCollapsible && (
                  <div className="flex items-center gap-1 text-xs font-bold" style={{ color: LIGHT }}>
                    {isCollapsed ? "Show" : "Hide"}
                    <div style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}>
                      <ChevronRight size={13} style={{ transform: "rotate(90deg)", color: LIGHT }} />
                    </div>
                  </div>
                )}
              </button>

              {/* Collapsed summary row */}
              {isCollapsed ? (
                <button onClick={() => toggleCollapse(status)}
                  className="w-full flex items-center gap-2 py-2.5 px-3 rounded-2xl mb-1"
                  style={{ background: CARD }}>
                  <div className="flex -space-x-2">
                    {group.slice(0, 4).map((f) => (
                      <div key={f.name} className="rounded-full border-2 border-white opacity-60">
                        <AvatarBubble i={f.avatar} color={f.color} size={28} />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-bold" style={{ color: MID }}>
                    {group.map((f) => f.name.split(" ")[0]).join(", ")}
                  </span>
                  <span className="ml-auto text-xs font-bold" style={{ color: LIGHT }}>tap to expand</span>
                </button>
              ) : (
                group.map((f) => (
                  <div key={f.name} className="flex items-center gap-3 p-3 rounded-2xl mb-2"
                    style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)", opacity: status !== "available" ? 0.85 : 1 }}>
                    <div className="relative">
                      <AvatarBubble i={f.avatar} color={f.color} size={44} />
                      <div className="absolute -bottom-0.5 -right-0.5"><StatusDot status={f.status} /></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold" style={{ color: DARK }}>{f.name}</p>
                      <p className="text-xs truncate" style={{ color: MID }}>{f.activity}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {f.groups.map((g) => (
                          <span key={g} className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                            style={{ background: (groups.find((gr) => gr.name === g)?.color ?? CARD) + "20",
                                     color: groups.find((gr) => gr.name === g)?.color ?? MID }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                        style={{ background: scColor(f.status) + "20", color: scColor(f.status) }}>
                        {scLabel(f.status)}
                      </span>
                      {f.status === "available" && (
                        <button className="text-xs font-extrabold px-2.5 py-1 rounded-xl"
                          style={{ background: MINT + "20", color: MINT }}>Ping! 👋</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}