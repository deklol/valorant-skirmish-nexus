import { ReactNode } from "react";

interface BroadcastLayoutProps {
  children: ReactNode;
  backgroundColor?: string;
}

export default function BroadcastLayout({ children, backgroundColor = "#0f172a" }: BroadcastLayoutProps) {
  return (
    <div 
      className="fixed inset-0 w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ backgroundColor }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}