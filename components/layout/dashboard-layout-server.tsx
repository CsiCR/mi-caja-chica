'use client';

import { ReactNode, useState } from 'react';
import { DashboardNavigation } from './dashboard-navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface DashboardLayoutServerProps {
  children: ReactNode;
  user?: {
    name?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

export function DashboardLayoutServer({ children, user }: DashboardLayoutServerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:overflow-y-auto lg:bg-white lg:shadow-sm">
        <DashboardNavigation />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 max-w-[280px]">
          <div className="flex h-full flex-col">
            {/* Logo con botón de cerrar */}
            {/* Botón de cerrar para móvil */}
            <div className="absolute right-4 top-4 z-50 lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-gray-100 h-8 w-8 p-0"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="text-2xl">×</span>
              </Button>
            </div>

            {/* User info en móvil */}
            {user && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-semibold">
                    {(user.firstName?.charAt(0) || user.name?.charAt(0) || 'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user.firstName || user.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto">
              <DashboardNavigation onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          {/* Hamburger Menu Button - VISIBLE EN MÓVIL */}
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden flex items-center justify-center h-10 w-10 border-2 border-green-500 bg-green-50 hover:bg-green-100 hover:border-green-600 transition-all duration-200 rounded-lg shadow-sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6 text-green-700" />
            <span className="sr-only">Abrir menú</span>
          </Button>

          {/* Mobile App Title */}
          <div className="lg:hidden flex items-center gap-2">
            <Image
              src="/app-icon.png"
              alt="Logo"
              width={28}
              height={28}
              className="rounded-md shadow-sm border border-green-100"
            />
            <span className="text-lg font-bold text-gray-900">Mi Caja Chica</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-sm text-slate-600 font-medium hidden sm:block border-l pl-4 border-slate-200">
              {user?.firstName || user?.name || 'Usuario'}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
