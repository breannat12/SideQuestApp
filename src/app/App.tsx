import { Bell, Compass, Home, Plus, User, Users } from "lucide-react";
import { useState } from "react";
import { NotifDrawer } from "./components/sheets/NotifDrawer";
import { PlanDetailSheet } from "./components/sheets/PlanDetailSheet";
import { SuggestSheet } from "./components/sheets/SuggestSheet";
import { BG, CORAL, DARK, LAVENDER, MID, MINT, SKY, WHITE } from "./constants/colors";
import { NOTIFS } from "./data/notifs";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { SignupScreen } from "./screens/SignupScreen";
import { CreateTab } from "./screens/tabs/CreateTab";
import { ExploreTab } from "./screens/tabs/ExploreTab";
import { FriendsTab } from "./screens/tabs/FriendsTab";
import { HomeTab } from "./screens/tabs/HomeTab";
import { ProfileTab } from "./screens/tabs/ProfileTab";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import type { Plan, Screen, Tab } from "./types";

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home",    label: "Home",    icon: Home    },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "create",  label: "Create",  icon: Plus    },
  { id: "friends", label: "Friends", icon: Users   },
  { id: "profile", label: "Profile", icon: User    },
];

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]           = useState<Screen>("welcome");
  const [tab, setTab]                 = useState<Tab>("home");
  const [notifOpen, setNotifOpen]     = useState(false);
  const [detailPlan, setDetailPlan]   = useState<Plan | null>(null);
  const [suggestPlan, setSuggestPlan] = useState<Plan | null>(null);
  const [userName, setUserName]       = useState("");

  const unread = NOTIFS.filter((n) => !n.read).length;

  const openSuggest = (p: Plan) => {
    setDetailPlan(null);
    setSuggestPlan(p);
  };

  return (
    <div className="size-full flex items-center justify-center"
      style={{
        fontFamily: "'Nunito', sans-serif",
        background: "radial-gradient(ellipse at 30% 20%, #D8EFFF 0%, #F0FFF8 45%, #FFE8EF 100%)",
      }}>
      {/* Phone chassis */}
      <div className="relative flex flex-col overflow-hidden"
        style={{
          width: 390, height: 844,
          borderRadius: 52,
          background: BG,
          boxShadow: "0 50px 100px rgba(0,0,0,0.22), 0 0 0 10px #1C1C1E, 0 0 0 12px #3A3A3C, inset 0 0 0 1px rgba(255,255,255,0.1)",
        }}>

        {/* Status bar */}
        <div className="flex items-center justify-between px-8 py-2.5 flex-shrink-0 relative">
          <span className="text-xs font-extrabold" style={{ color: DARK, zIndex: 2 }}>9:41</span>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 rounded-b-2xl" style={{ background: "#1C1C1E" }} />
          <div className="flex items-center gap-1.5" style={{ zIndex: 2 }}>
            <div className="flex gap-0.5 items-end h-3">
              {[3, 4, 5, 6].map((h) => <div key={h} className="w-0.5 rounded-sm" style={{ height: h, background: DARK }} />)}
            </div>
            <div className="text-xs font-bold" style={{ color: DARK, fontSize: 9 }}>WiFi</div>
            <div className="flex items-center">
              <div className="rounded border overflow-hidden" style={{ width: 22, height: 11, borderColor: DARK, borderWidth: 1.2 }}>
                <div className="h-full rounded-sm" style={{ width: "75%", background: MINT }} />
              </div>
              <div className="w-0.5 h-1.5 rounded-r flex-shrink-0" style={{ background: DARK }} />
            </div>
          </div>
        </div>

        {/* Pre-app screens */}
        {screen === "welcome" && (
          <div className="absolute inset-0 z-50">
            <WelcomeScreen
              onSignUp={() => setScreen("signup")}
              onLogIn={() => setScreen("onboarding")}
            />
          </div>
        )}
        {screen === "signup" && (
          <div className="absolute inset-0 z-50">
            <SignupScreen
              onNext={(name) => { setUserName(name); setScreen("onboarding"); }}
              onBack={() => setScreen("welcome")}
            />
          </div>
        )}
        {screen === "onboarding" && (
          <div className="absolute inset-0 z-50">
            <OnboardingScreen userName={userName} onComplete={() => setScreen("app")} />
          </div>
        )}

        {/* Notification drawer */}
        {notifOpen && <NotifDrawer onClose={() => setNotifOpen(false)} />}

        {/* Plan detail sheet */}
        {detailPlan && !suggestPlan && (
          <PlanDetailSheet
            plan={detailPlan}
            onClose={() => setDetailPlan(null)}
            onSuggest={() => openSuggest(detailPlan)}
          />
        )}

        {/* Suggest sheet */}
        {suggestPlan && (
          <SuggestSheet plan={suggestPlan} onClose={() => setSuggestPlan(null)} />
        )}

        {/* Page content */}
        <div className="flex-1 overflow-hidden relative">
          {tab === "explore" && screen === "app" && (
            <button onClick={() => setNotifOpen(true)}
              className="absolute top-4 right-5 z-30 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: CORAL + "18" }}>
              <Bell size={19} style={{ color: CORAL }} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-extrabold border-2 border-white"
                  style={{ background: CORAL, fontSize: 8 }}>{unread}</span>
              )}
            </button>
          )}

          {tab === "home"    && <HomeTab    onPlanTap={setDetailPlan} onSuggest={openSuggest} onBell={() => setNotifOpen(true)} unread={unread} />}
          {tab === "explore" && <ExploreTab onPlanTap={setDetailPlan} onSuggest={openSuggest} />}
          {tab === "create"  && <CreateTab  onCreated={() => setTab("home")} />}
          {tab === "friends" && <FriendsTab />}
          {tab === "profile" && <ProfileTab />}
        </div>

        {/* Bottom nav */}
        <div className="flex items-end px-3 pb-6 pt-2 flex-shrink-0"
          style={{ background: BG, borderTop: "1px solid rgba(110,198,255,0.25)" }}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const active   = tab === id;
            const isCreate = id === "create";
            return (
              <button key={id} onClick={() => setTab(id)}
                className="flex-1 flex flex-col items-center gap-0.5 transition-all select-none">
                {isCreate ? (
                  <div className="w-14 h-14 -mt-5 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})`, boxShadow: `0 8px 20px ${SKY}60` }}>
                    <Icon size={24} color={WHITE} />
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-8 flex items-center justify-center rounded-xl transition-all"
                      style={{ background: active ? SKY + "20" : "transparent" }}>
                      <Icon size={20} style={{ color: active ? SKY : MID }} strokeWidth={active ? 2.5 : 1.8} />
                    </div>
                    <span className="text-xs font-extrabold transition-all" style={{ color: active ? SKY : MID }}>
                      {label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
