import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 border-b border-border flex items-center px-2 sm:px-3 gap-2 bg-card/80 backdrop-blur sticky top-0 z-20">
            <SidebarTrigger className="h-7 w-7" />
            <div className="h-4 w-px bg-border" />
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">FreqDash Terminal</div>
            <div className="ml-auto flex items-center gap-2 text-[10px] tabular text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gain animate-pulse" />
              <span className="uppercase tracking-wider">Live · 5s</span>
            </div>
          </header>
          <main className="flex-1 p-2.5 sm:p-3 md:p-4 overflow-auto overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
