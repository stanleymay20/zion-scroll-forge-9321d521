import { Outlet, useLocation } from "react-router-dom";
import { MainNavigation } from "./MainNavigation";
import { MobileNavigation } from "./MobileNavigation";
import { Breadcrumbs } from "./Breadcrumbs";
import { BackButton } from "./BackButton";
import { InstitutionGuard } from "@/components/InstitutionGuard";

export const MainLayout = () => {
  const { pathname } = useLocation();
  const showBack = pathname !== "/dashboard" && pathname !== "/";
  const allowWithoutInstitution = ["/apply", "/orientation", "/matriculation"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  ) || /^\/courses\/[^/]+(?:\/.*)?$/.test(pathname);

  const content = (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Skip to content for keyboard / screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:text-sm"
      >
        Skip to content
      </a>

      <MainNavigation />
      <MobileNavigation />

      <main
        id="main-content"
        className="lg:ml-64 pb-24 lg:pb-10 pt-14 lg:pt-0 min-h-screen"
      >
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 mx-auto">
          {showBack && (
            <div className="flex items-center justify-between gap-2 mb-1 lg:mb-2">
              <BackButton />
            </div>
          )}
          <Breadcrumbs />
          <Outlet />
        </div>
      </main>
    </div>
  );

  return (
    <InstitutionGuard allowWithoutInstitution={allowWithoutInstitution}>
      {content}
    </InstitutionGuard>
  );
};
