import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileNavigation from "./MobileNavigation";
import DesktopNavigation from "./DesktopNavigation";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const isAdminRoute = location.startsWith('/admin');

  // Don't show navigation on admin login page
  if (location === '/admin/login') {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <MobileNavigation isAdminRoute={isAdminRoute} />
      ) : (
        <DesktopNavigation isAdminRoute={isAdminRoute} />
      )}
      <main className={`${isMobile ? 'pb-16' : ''} ${isAdminRoute ? 'pt-0' : ''}`}>
        {children}
      </main>
    </div>
  );
}
