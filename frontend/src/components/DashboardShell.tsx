'use client';

import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useWebSocket } from '@/hooks/useWebSocket';

interface DashboardShellProps {
  children: (wsData: ReturnType<typeof useWebSocket>) => React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const wsData = useWebSocket();

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <TopBar connected={wsData.connected} />
      <main className="ml-[220px] pt-14 min-h-screen">
        <div className="p-6">
          {children(wsData)}
        </div>
      </main>
    </div>
  );
}
