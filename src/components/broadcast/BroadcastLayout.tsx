import { ReactNode } from "react";

interface BroadcastLayoutProps {
  children: ReactNode;
  backgroundColor?: string;
}

export default function BroadcastLayout({ children, backgroundColor = "#0f172a" }: BroadcastLayoutProps) {
  return (
    <div 
      className="fixed inset-0 w-screen h-screen overflow-hidden"
      style={{ backgroundColor }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full max-w-[1920px] max-h-[1080px] relative flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}