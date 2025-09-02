import React from "react";
import { useLocation } from "wouter";
import { useAppSelector } from "@/store/hooks";
import { Sidebar } from "./Sidebar";
import { adminNavItems, customerNavItems } from "@/config/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const isAdminRoute = location.startsWith('/admin');

  // Don't show navigation on admin login page
  if (location === '/admin/login') {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <Sidebar 
      items={isAdminRoute ? adminNavItems : customerNavItems} 
      isAdmin={isAdminRoute}
    >
      <div className="p-4 lg:p-8">
        {children}
      </div>
    </Sidebar>
  );
}
