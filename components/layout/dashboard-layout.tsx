
'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Wallet,
  Home,
  Building2,
  CreditCard,
  BookOpen,
  ArrowUpDown,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  User
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Entidades',
    href: '/dashboard/entidades',
    icon: Building2,
  },
  {
    name: 'Cuentas Bancarias',
    href: '/dashboard/cuentas',
    icon: CreditCard,
  },
  {
    name: 'Asientos Contables',
    href: '/dashboard/asientos',
    icon: BookOpen,
  },
  {
    name: 'Transacciones',
    href: '/dashboard/transacciones',
    icon: ArrowUpDown,
  },
  {
    name: 'Reportes',
    href: '/dashboard/reportes',
    icon: BarChart3,
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Debug para verificar el estado

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-24 shrink-0 items-center border-b border-gray-200 px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo-full.png"
            alt="Logo"
            width={150}
            height={60}
            className="h-auto w-auto max-h-16"
          />
        </Link>
        {/* Cerrar en móvil */}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto hover:bg-gray-100"
            onClick={() => {
              setSidebarOpen(false);
            }}
          >
            <span className="text-xl">×</span>
          </Button>
        )}
      </div>

      {/* User info en móvil */}
      {isMobile && session && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-green-100 text-green-700">
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
              <p className="text-xs text-gray-600">{session.user?.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-green-100 text-green-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  onClick={() => {
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5',
                      isActive ? 'text-green-700' : 'text-gray-500 group-hover:text-gray-700'
                    )}
                  />
                  {item.name}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-green-600 rounded-full"></div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer en móvil */}
      {isMobile && (
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:overflow-y-auto lg:bg-white lg:shadow-sm">
        <SidebarContent isMobile={false} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 max-w-[280px]">
          <SidebarContent isMobile={true} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8"
          style={{ minHeight: '64px' }}>
          {/* Hamburger Menu Button */}
          <Button
            variant="outline"
            className="flex lg:hidden items-center justify-center h-10 w-10 border-2 border-green-500 bg-green-50 hover:bg-green-100 hover:border-green-600 transition-all duration-200 rounded-lg shadow-sm"
            onClick={() => {
              setSidebarOpen(true);
            }}
          >
            <Menu className="h-6 w-6 text-green-700" />
            <span className="sr-only">Abrir menú</span>
          </Button>

          {/* Mobile App Title */}
          <div className="lg:hidden flex items-center gap-1.5 min-w-0">
            <Image
              src="/app-icon.png"
              alt="Logo"
              width={24}
              height={24}
              className="rounded-md shadow-sm border border-green-100 shrink-0"
            />
            <span className="text-base font-bold text-gray-900 tracking-tight truncate">Mi Caja Chica</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {getInitials(session?.user?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
