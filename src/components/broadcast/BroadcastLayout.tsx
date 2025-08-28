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
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-[90vw] max-h-[80vh] flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}