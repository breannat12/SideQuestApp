import { useState } from "react";
import { CARD, DANGER, DARK, MID, WHITE } from "../../constants/colors";
import { cancelPlan, planErrorMessage } from "../../data/plans";
import type { Plan } from "../../types";

/**
 * The stop-and-think before a plan is called off. Cancelling reaches into other
 * people's Home tabs and takes something off them, so it isn't a thing to do by
 * brushing a button on a scrolling list.
 */
export function CancelPlanDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await cancelPlan(plan.id);
      // No unsetting `busy` on the way out: the write lands, the snapshot drops
      // the plan, and this dialog goes with it.
      onClose();
    } catch (err) {
      setError(planErrorMessage(err));
      setBusy(false);
    }
  };

  // "All your friends in Everyone" reads badly, so the catch-all group drops
  // the qualifier rather than naming itself.
  const everyone = plan.group === "Everyone" || !plan.group;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-8"
      style={{ background: "rgba(0,0,0,0.45)" }}
      // Tapping the dim area is a way out, but not mid-write.
      onClick={() => { if (!busy) onClose(); }}>
      <div className="w-full rounded-3xl p-6 flex flex-col items-center text-center"
        style={{ background: WHITE, maxWidth: 320, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mb-3"
          style={{ background: DANGER + "18" }}>
          {plan.emoji}
        </div>

        {/* Names the plan rather than saying "this plan" — the dialog can be
            reached from a list of several, and the title is what confirms you
            are about to call off the one you meant. Titles cap at 40 characters
            on the create screen, so this wraps at worst rather than overflowing. */}
        <h2 className="text-lg font-extrabold leading-tight" style={{ color: DARK }}>
          Cancel {plan.activity}?
        </h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: MID }}>
          {everyone ? (
            <>All your friends will be notified.</>
          ) : (
            <>All your friends in <strong style={{ color: DARK }}>{plan.group}</strong> will be notified.</>
          )}
        </p>

        {error && (
          <p className="text-xs font-bold mt-3" style={{ color: DANGER }}>{error}</p>
        )}

        <div className="flex flex-col gap-2 w-full mt-5">
          {/* The safe way out goes first and reads loudest — the destructive
              button shouldn't be the one your thumb lands on by default. */}
          <button onClick={onClose} disabled={busy}
            className="w-full py-3 rounded-2xl text-sm font-extrabold"
            style={{ background: CARD, color: DARK, opacity: busy ? 0.6 : 1 }}>
            Nvm, plan is still on!
          </button>
          <button onClick={() => void confirm()} disabled={busy}
            className="w-full py-3 rounded-2xl text-sm font-extrabold"
            style={{ background: DANGER, color: WHITE, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Cancelling…" : "Yes, cancel plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
