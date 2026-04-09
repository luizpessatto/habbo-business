export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1a1a2e]">
      {children}
    </div>
  );
}
