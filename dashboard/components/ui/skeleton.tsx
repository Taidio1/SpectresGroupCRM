import React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// 🚀 PROGRESSIVE LOADING SKELETONS - Zaawansowane komponenty skeleton

/**
 * Skeleton dla tabeli klientów
 */
function ClientTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex space-x-4 py-2 border-b">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 py-3 border-b border-muted">
          <Skeleton className="h-4 w-8" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <div className="flex space-x-1">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton dla kart dashboard
 */
function DashboardCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}

/**
 * Skeleton dla raportów miesięcznych
 */
function MonthlyReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Table */}
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-4">
          <ClientTableSkeleton rows={8} />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton dla aktywności zespołu
 */
function TeamActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex space-x-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton dla formularza klienta
 */
function ClientFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-20 w-full" />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  )
}

/**
 * Animated Progress Skeleton - pokazuje progress loading
 */
function ProgressSkeleton({ 
  progress, 
  label 
}: { 
  progress: number; 
  label?: string; 
}) {
  return (
    <div className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {label && (
        <p className="text-xs text-muted-foreground">{label}</p>
      )}
    </div>
  )
}

/**
 * Batch Loading Skeleton - dla progressive batch loading
 */
function BatchLoadingSkeleton({ 
  totalBatches, 
  currentBatch, 
  itemsLoaded, 
  totalItems 
}: {
  totalBatches: number;
  currentBatch: number;
  itemsLoaded: number;
  totalItems: number;
}) {
  const progress = totalItems > 0 ? (itemsLoaded / totalItems) * 100 : 0;
  
  return (
    <div className="space-y-4 p-6 rounded-lg border border-dashed border-muted">
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm">Ładowanie danych...</span>
        </div>
      </div>
      
      <ProgressSkeleton 
        progress={progress}
        label={`Batch ${currentBatch + 1} z ${totalBatches} • ${itemsLoaded} z ${totalItems} elementów`}
      />
      
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalBatches }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full",
              i <= currentBatch ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Content Fade In - smooth fade in animation for loaded content
 */
function ContentFadeIn({ 
  children, 
  isLoaded, 
  delay = 0 
}: { 
  children: React.ReactNode; 
  isLoaded: boolean; 
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        isLoaded 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-2"
      )}
      style={{ 
        transitionDelay: isLoaded ? `${delay}ms` : '0ms' 
      }}
    >
      {children}
    </div>
  )
}

export { 
  Skeleton,
  ClientTableSkeleton,
  DashboardCardSkeleton,
  MonthlyReportSkeleton,
  TeamActivitySkeleton,
  ClientFormSkeleton,
  ProgressSkeleton,
  BatchLoadingSkeleton,
  ContentFadeIn
}
