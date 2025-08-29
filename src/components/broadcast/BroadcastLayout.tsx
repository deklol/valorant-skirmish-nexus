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
        <div className="w-full h-full relative flex items-center justify-center p-4">
          <div className="flex-1 flex items-center justify-center min-h-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}