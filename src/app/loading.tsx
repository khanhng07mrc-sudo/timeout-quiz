import Logo3DGyroscope from "@/components/ui/Logo3DGyroscope";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-radial-gradient from-[#0f172a] via-[#080d1a] to-[#030712] select-none">
      <div className="relative flex flex-col items-center justify-center">
        <Logo3DGyroscope size="xl" className="scale-125 sm:scale-150 drop-shadow-[0_0_35px_rgba(6,182,212,0.6)]" />
      </div>
    </div>
  );
}
