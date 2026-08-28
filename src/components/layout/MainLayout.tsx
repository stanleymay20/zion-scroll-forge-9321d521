import { Outlet, useLocation } from "react-router-dom";
import { MainNavigation } from "./MainNavigation";
import { MobileNavigation } from "./MobileNavigation";
import { Breadcrumbs } from "./Breadcrumbs";
import { BackButton } from "./BackButton";
import { AppCommandPalette } from "./AppCommandPalette";
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
        <div className="sticky top-0 z-30 hidden h-14 items-center border-b border-border/70 bg-background/90 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:flex">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Scroll University
              </p>
              <p className="truncate text-sm font-semibold text-foreground">Digital Campus</p>
            </div>
            <div className="ml-auto flex w-full max-w-md justify-end">
              <AppCommandPalette />
            </div>
          </div>
        </div>

        <div className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-7 mx-auto">
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
