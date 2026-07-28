import { CORAL, LIGHT, MINT } from "../../constants/colors";

export function StatusDot({ status }: { status: string }) {
  const c = status === "available" ? MINT : status === "busy" ? CORAL : LIGHT;
  return <span className="block rounded-full border-2 border-white" style={{ width: 12, height: 12, background: c }} />;
}
