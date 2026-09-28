import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/finia/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => { const { data, error } = await supabase.auth.getUser(); if (error || !data.user) throw redirect({ to: "/" }); return { user: data.user }; },
  pendingComponent: () => <div className="grid min-h-screen grid-cols-[16rem_1fr]"><Skeleton className="hidden h-screen lg:block"/><div className="space-y-6 p-8"><Skeleton className="h-16 w-full"/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-32"/>)}</div><Skeleton className="h-72 w-full"/></div></div>,
  component: () => <AppShell><Outlet /></AppShell>,
});