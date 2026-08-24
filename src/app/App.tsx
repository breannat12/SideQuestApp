import { Bell, Compass, Home, Plus, User, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NotifDrawer } from "./components/sheets/NotifDrawer";
import { PlanDetailSheet } from "./components/sheets/PlanDetailSheet";
import { CancelPlanDialog } from "./components/sheets/CancelPlanDialog";
import { EditPlanSheet } from "./components/sheets/EditPlanSheet";
// SUGGEST CHANGES CODE: the sheet for proposing a different time or place on a
// plan someone else hosts. The file is still there, just unreferenced — restore
// this import alongside the fork further down.
// import { SuggestSheet } from "./components/sheets/SuggestSheet";
import { BG, CORAL, DARK, LAVENDER, MID, SKY, WHITE } from "./constants/colors";
import { CurrentUserProvider, useCurrentUser } from "./data/currentUser";
import { FriendRequestProvider } from "./data/friendRequests";
import { useNotifs } from "./data/notifs";
import { PlanFeedProvider } from "./data/planFeed";
import { CreateProfileScreen } from "./screens/CreateProfileScreen";
import { LoginScreen } from "./screens/LoginScreen";
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
      {/* Inside the user provider: these queries are per-account, and can't
          subscribe until Firebase has said whose session this is. */}
      <FriendRequestProvider>
        <PlanFeedProvider>
          <AppShell />
        </PlanFeedProvider>
      </FriendRequestProvider>
    </CurrentUserProvider>
  );
}

function AppShell() {
  const [screen, setScreen]           = useState<Screen>("loading");
  const [tab, setTab]                 = useState<Tab>("home");
  const [notifOpen, setNotifOpen]     = useState(false);
  const [detailPlan, setDetailPlan]   = useState<Plan | null>(null);
  // SUGGEST CHANGES CODE: was `suggestPlan`, and held anyone's plan. Now only
  // ever your own, since editing is the one thing left that opens a sheet.
  const [editPlan, setEditPlan]       = useState<Plan | null>(null);
  // Held here rather than in the card: the dialog dims the whole app, and a
  // card sits inside Home's scroll container where an overlay would be clipped.
  const [cancelling, setCancelling]   = useState<Plan | null>(null);
  const { name: userName, status, hasProfile } = useCurrentUser();
  const { unread } = useNotifs();

  // Boot routing. Fires once, the moment Firebase says whether a session
  // survived: a finished account goes straight in, one that stopped partway
  // resumes at profile setup, and everyone else meets the welcome screen.
  // After this the user drives navigation, so it must not run again — logging
  // out, for instance, sets the screen itself.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current || status === "loading") return;
    booted.current = true;
    setScreen(status === "signedOut" ? "welcome" : hasProfile ? "app" : "createProfile");
  }, [status, hasProfile]);

  const openEdit = (p: Plan) => {
    // SUGGEST CHANGES CODE: this used to take any plan and let the fork below
    // decide which sheet to show. Guarded now, so a plan you don't host can't
    // reach the edit sheet by some other route — the rules would reject the
    // write anyway, and failing silently here beats failing at the server.
    if (p.host !== "You") return;
    setDetailPlan(null);
    setEditPlan(p);
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
        {screen === "loading" && (
          <div className="absolute inset-0 z-50"><SplashScreen /></div>
        )}
        {screen === "welcome" && (
          <div className="absolute inset-0 z-50">
            <WelcomeScreen
              onSignUp={() => setScreen("signup")}
              onLogIn={() => setScreen("login")}
            />
          </div>
        )}
        {screen === "login" && (
          <div className="absolute inset-0 z-50">
            <LoginScreen
              onLoggedIn={() => setScreen("app")}
              onNeedsProfile={() => setScreen("createProfile")}
              onSignUp={() => setScreen("signup")}
              onBack={() => setScreen("welcome")}
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
        {detailPlan && !editPlan && (
          <PlanDetailSheet
            plan={detailPlan}
            onClose={() => setDetailPlan(null)}
            onEdit={() => openEdit(detailPlan)}
          />
        )}

        {/* Edit sheet — your own plan only.
            SUGGEST CHANGES CODE: this was a fork, with SuggestSheet handling
            plans hosted by someone else. To bring it back, restore:

              {editPlan && (
                editPlan.host === "You"
                  ? <EditPlanSheet plan={editPlan} onClose={() => setEditPlan(null)} />
                  : <SuggestSheet  plan={editPlan} onClose={() => setEditPlan(null)} />
              )}

            …and drop the host guard in `openEdit` above. */}
        {editPlan && <EditPlanSheet plan={editPlan} onClose={() => setEditPlan(null)} />}

        {/* Last of the overlays, so it sits above anything else that's open. */}
        {cancelling && (
          <CancelPlanDialog plan={cancelling} onClose={() => setCancelling(null)} />
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

          {tab === "home"    && <HomeTab    onPlanTap={setDetailPlan} onEdit={openEdit} onCancel={setCancelling} onBell={() => setNotifOpen(true)} unread={unread} />}
          {/* SUGGEST CHANGES CODE: Explore lists other people's plans only, so
              it had `onSuggest={openSuggest}` here. Nothing to hand it now. */}
          {tab === "explore" && <ExploreTab onPlanTap={setDetailPlan} />}
          {tab === "create"  && <CreateTab  onCreated={() => setTab("home")} />}
          {tab === "friends" && <FriendsTab />}
          {tab === "profile" && (
            <ProfileTab onSignedOut={() => { setTab("home"); setScreen("welcome"); }} />
          )}
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

/**
 * Held for the moment Firebase takes to report an existing session. Without it
 * someone already signed in watches the welcome screen flash past on every load.
 */
function SplashScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: BG }}>
      <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})`, boxShadow: `0 12px 32px ${SKY}50` }}>
        <span className="text-4xl">🤙</span>
      </div>
      <h1 className="text-2xl font-extrabold mt-5" style={{ color: DARK, letterSpacing: "-0.03em" }}>
        sidequest
      </h1>
    </div>
  );
}
