import { ME, useCurrentUser } from "../../data/currentUser";

export function AvatarBubble({ i, color, size = 40 }: { i: string; color: string; size?: number }) {
  const { initials } = useCurrentUser();

  return (
    <div className="rounded-full flex items-center justify-center font-extrabold text-white flex-shrink-0 select-none"
      style={{ width: size, height: size, background: color, fontSize: size * 0.33, letterSpacing: "-0.02em" }}>
      {i === ME ? initials : i}
    </div>
  );
}
