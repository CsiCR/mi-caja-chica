'use client';

import {
  Wallet,
  Home,
  Building2,
  CreditCard,
  BookOpen,
  ArrowUpDown,
  BarChart3,
  Info,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  {
    name: 'Información',
    href: '/dashboard/informacion',
    icon: Info,
  },
];

interface DashboardNavigationProps {
  onNavigate?: () => void;
}

export function DashboardNavigation({ onNavigate }: DashboardNavigationProps = {}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-24 shrink-0 items-center border-b border-gray-200 px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo-full.png"
            alt="Mi Caja Chica Logo"
            width={150}
            height={60}
            className="h-auto w-auto max-h-16"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-green-100 text-green-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
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

      {/* Footer con versión y copyright */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => {
              handleSignOut();
              if (onNavigate) onNavigate();
            }}
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-9 text-xs"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>

          <div className="flex flex-col items-center justify-center gap-1 opacity-50 px-2">
            <div className="flex items-center gap-1.5 grayscale opacity-70">
              <Image src="/logo-reduced.png" alt="Icono" width={16} height={16} />
              <span className="text-[10px] font-bold tracking-tight uppercase">Mi Caja Chica</span>
            </div>
            <div className="text-[9px] font-medium flex flex-col items-center">
              <span>© 2026 Todos los derechos reservados</span>
              <span className="text-primary/70 font-bold">Versión 1.2.0-ZEN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
