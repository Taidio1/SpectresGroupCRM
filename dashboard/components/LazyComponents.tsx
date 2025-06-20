import React, { Suspense } from 'react';
import { DashboardCardSkeleton, MonthlyReportSkeleton, TeamActivitySkeleton, ClientFormSkeleton } from '@/components/ui/skeleton';

/**
 * 🚀 LAZY LOADING SYSTEM - Komponenty ładowane na żądanie
 * 
 * Znacząco zmniejsza initial bundle size i poprawia czas pierwszego ładowania
 * 
 * Zgodnie z Progressive Loading optimization plan
 */

// Lazy load głównych komponentów aplikacji
export const LazyClientDetailsPopup = React.lazy(() => 
  import('@/components/client-details-popup').then(module => ({
    default: module.ClientDetailsPopup
  }))
);

export const LazyGeneralReports = React.lazy(() => 
  import('@/components/general-reports').then(module => ({
    default: module.GeneralReports
  }))
);

export const LazyReports = React.lazy(() => 
  import('@/components/reports').then(module => ({
    default: module.Reports
  }))
);

export const LazyPerformanceDashboard = React.lazy(() => 
  import('@/components/admin/performance-dashboard').then(module => ({
    default: module.PerformanceDashboard
  }))
);

export const LazyUserSettingsForm = React.lazy(() => 
  import('@/components/settings/user-settings-form').then(module => ({
    default: module.UserSettingsForm
  }))
);

/**
 * Higher-Order Component dla lazy loading z custom skeleton
 */
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  name?: string;
}

export function LazyWrapper({ children, fallback: FallbackComponent, name }: LazyWrapperProps) {
  const defaultFallback = (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground text-sm">
          {name ? `Ładowanie ${name}...` : 'Ładowanie komponentu...'}
        </p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={FallbackComponent ? <FallbackComponent /> : defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Komponenty wrapper z dedicated skeleton loaders
 */
export function LazyClientDetailsPopupWrapper(props: any) {
  return (
    <LazyWrapper 
      fallback={() => <ClientFormSkeleton />} 
      name="detali klienta"
    >
      <LazyClientDetailsPopup {...props} />
    </LazyWrapper>
  );
}

export function LazyGeneralReportsWrapper(props: any) {
  return (
    <LazyWrapper 
      fallback={() => <MonthlyReportSkeleton />} 
      name="raportów ogólnych"
    >
      <LazyGeneralReports {...props} />
    </LazyWrapper>
  );
}

export function LazyReportsWrapper(props: any) {
  return (
    <LazyWrapper 
      fallback={() => <MonthlyReportSkeleton />} 
      name="raportów"
    >
      <LazyReports {...props} />
    </LazyWrapper>
  );
}

export function LazyPerformanceDashboardWrapper(props: any) {
  return (
    <LazyWrapper 
      fallback={() => (
        <div className="space-y-6">
          <DashboardCardSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
          </div>
          <TeamActivitySkeleton />
        </div>
      )} 
      name="panelu wydajności"
    >
      <LazyPerformanceDashboard {...props} />
    </LazyWrapper>
  );
}

export function LazyUserSettingsFormWrapper(props: any) {
  return (
    <LazyWrapper 
      fallback={() => <ClientFormSkeleton />} 
      name="ustawień użytkownika"
    >
      <LazyUserSettingsForm {...props} />
    </LazyWrapper>
  );
}

/**
 * Hook do preloadingu komponentów przy hover
 */
export function usePreloadComponent(componentLoader: () => Promise<any>) {
  const preload = () => {
    componentLoader().catch(err => {
      console.warn('Preload failed:', err);
    });
  };

  return { preload };
}

/**
 * Preload utilities dla lepszej UX
 */
export const preloadComponents = {
  clientDetails: () => import('@/components/client-details-popup'),
  reports: () => import('@/components/reports'), 
  generalReports: () => import('@/components/general-reports'),
  performanceDashboard: () => import('@/components/admin/performance-dashboard'),
  userSettings: () => import('@/components/settings/user-settings-form')
};

/**
 * Hook do batch preloadingu
 */
export function useBatchPreload(components: Array<keyof typeof preloadComponents>) {
  const preloadAll = () => {
    components.forEach(componentName => {
      preloadComponents[componentName]().catch(err => {
        console.warn(`Failed to preload ${componentName}:`, err);
      });
    });
  };

  return { preloadAll };
} 