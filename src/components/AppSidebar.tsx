import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ListOrdered, LineChart, Settings as SettingsIcon, LogOut, Activity } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Trades", url: "/trades", icon: ListOrdered },
  { title: "Analytics", url: "/analytics", icon: LineChart },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="font-bold text-sidebar-foreground tracking-tight">FreqDash</div>
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-2">
          <SidebarMenuButton onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
