import { Bell, Compass, Home, Plus, User, Users } from "lucide-react";
import { useState } from "react";
import { NotifDrawer } from "./components/sheets/NotifDrawer";
import { PlanDetailSheet } from "./components/sheets/PlanDetailSheet";
import { SuggestSheet } from "./components/sheets/SuggestSheet";
import { BG, CORAL, LAVENDER, MID, SKY, WHITE } from "./constants/colors";
import { CurrentUserProvider, useCurrentUser } from "./data/currentUser";
import { NOTIFS } from "./data/notifs";
import { CreateProfileScreen } from "./screens/CreateProfileScreen";
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
  return (
    <CurrentUserProvider>
      <AppShell />
    </CurrentUserProvider>
  );
}

function AppShell() {
  const [screen, setScreen]           = useState<Screen>("welcome");
  const [tab, setTab]                 = useState<Tab>("home");
  const [notifOpen, setNotifOpen]     = useState(false);
  const [detailPlan, setDetailPlan]   = useState<Plan | null>(null);
  const [suggestPlan, setSuggestPlan] = useState<Plan | null>(null);
  const { name: userName } = useCurrentUser();

  const unread = NOTIFS.filter((n) => !n.read).length;

  const openSuggest = (p: Plan) => {
    setDetailPlan(null);
    setSuggestPlan(p);
  };

  return (
    // Fills the real viewport: `100dvh` tracks mobile browser chrome as it
    // collapses, and `size-full` is the fallback where dvh is unsupported.
    // Safe-area padding keeps content clear of the notch / home indicator.
    <div className="size-full relative flex flex-col overflow-hidden"
      style={{
        height: "100dvh",
        fontFamily: "'Nunito', sans-serif",
        background: BG,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>

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
              onNext={() => setScreen("createProfile")}
              onBack={() => setScreen("welcome")}
            />
          </div>
        )}
        {screen === "createProfile" && (
          <div className="absolute inset-0 z-50">
            <CreateProfileScreen
              onNext={() => setScreen("onboarding")}
              onBack={() => setScreen("signup")}
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
  );
}
