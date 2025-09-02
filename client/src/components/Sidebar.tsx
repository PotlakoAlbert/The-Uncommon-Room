import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface MenuItem {
  icon: string;
  label: string;
  href: string;
}

interface SidebarProps {
  items: MenuItem[];
  isAdmin?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Sidebar({ items, isAdmin = false, className, children }: SidebarProps) {
  const [, navigate] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const cartCount = useSelector((state: RootState) =>
    state.cart.items.reduce((sum, i) => sum + i.quantity, 0)
  );
  const enhancedItems = useMemo(() => items, [items]);

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <span className="material-icons">
          {isMobileOpen ? "close" : "menu"}
        </span>
      </Button>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40",
          "transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {isAdmin ? "Admin Panel" : "Menu"}
          </h2>
        </div>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="px-3">
            {enhancedItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className="w-full justify-start gap-2 mb-1 relative"
                onClick={() => {
                  navigate(item.href);
                  setIsMobileOpen(false);
                }}
              >
                <span className="material-icons">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {!isAdmin && item.href === '/cart' && cartCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs w-5 h-5">
                    {cartCount}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main content wrapper */}
      <div className={cn(
        "min-h-screen transition-all duration-200 ease-in-out",
        "lg:ml-64" // Add margin on desktop to account for sidebar
      )}>
        {children}
      </div>
    </>
  );
}
