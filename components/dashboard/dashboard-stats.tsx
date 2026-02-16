

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, CreditCard, ArrowUpDown, FileText, TrendingUp, RefreshCw, Bell, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  entidades: number;
  cuentas: number;
  transacciones: number;
  asientos: number;
  transaccionesPendientes: number;
  saldoTotal: {
    ARS: number;
    USD: number;
  };
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchStats = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch('/api/dashboard/stats', {
        cache: 'no-cache', // Forzar nueva consulta
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
        console.log('Stats actualizadas:', data); // Debug
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Refrescar automáticamente cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Escuchar eventos de refresh del dashboard
  useEffect(() => {
    const handleRefreshDashboard = () => {
      fetchStats(true);
    };

    window.addEventListener('refreshDashboard', handleRefreshDashboard);

    return () => {
      window.removeEventListener('refreshDashboard', handleRefreshDashboard);
    };
  }, []);

  const statCards = [
    {
      title: 'Entidades Activas',
      value: stats?.entidades || 0,
      icon: Building2,
      color: 'green',
      href: '/dashboard/entidades',
      description: 'Emprendimientos'
    },
    {
      title: 'Cuentas Bancarias',
      value: stats?.cuentas || 0,
      icon: CreditCard,
      color: 'blue',
      href: '/dashboard/cuentas',
      description: 'Cuentas activas'
    },
    {
      title: 'Transacciones',
      value: stats?.transacciones || 0,
      icon: ArrowUpDown,
      color: 'purple',
      href: '/dashboard/transacciones',
      description: 'Movimientos'
    },
    {
      title: 'Asientos Contables',
      value: stats?.asientos || 0,
      icon: FileText,
      color: 'orange',
      href: '/dashboard/asientos',
      description: 'Categorías'
    }
  ];

  return (
    <div className="space-y-4 px-1">
      {/* Header con botón de refresh */}
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Resumen</h2>
          {stats?.transaccionesPendientes && stats.transaccionesPendientes > 0 && (
            <div
              className="relative cursor-pointer transition-transform active:scale-95 hover:scale-105"
              onClick={() => router.push('/dashboard/reportes?tab=vencimientos&filter=vencidas')}
              title={`${stats.transaccionesPendientes} transacciones pendientes o vencidas`}
            >
              <div className="bg-orange-100 p-1.5 rounded-full border border-orange-200">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 animate-swing" />
              </div>
              <Badge className="absolute -top-1 -right-1 h-3.5 w-3.5 p-0 flex items-center justify-center bg-red-500 text-[9px] border-white border rounded-full">
                !
              </Badge>
            </div>
          )}
        </div>
        <Button
          onClick={() => fetchStats(true)}
          variant="ghost"
          size="sm"
          disabled={refreshing}
          className="flex items-center gap-1.5 h-8 text-xs text-slate-500 hover:text-primary transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          <span className="hidden sm:inline">{refreshing ? 'Actualizando...' : 'Refrescar'}</span>
        </Button>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-95",
                "border-l-4",
                card.color === 'green' && "border-l-green-500 hover:bg-green-50/50",
                card.color === 'blue' && "border-l-blue-500 hover:bg-blue-50/50",
                card.color === 'purple' && "border-l-purple-500 hover:bg-purple-50/50",
                card.color === 'orange' && "border-l-orange-500 hover:bg-orange-50/50"
              )}
              onClick={() => router.push(card.href)}
            >
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-medium text-gray-500 truncate">{card.title}</p>
                    <p className={cn(
                      "text-base sm:text-lg font-bold truncate leading-none my-1",
                      card.color === 'green' && "text-green-700",
                      card.color === 'blue' && "text-blue-700",
                      card.color === 'purple' && "text-purple-700",
                      card.color === 'orange' && "text-orange-700"
                    )}>
                      {loading ? '...' : card.value}
                    </p>
                    <p className="text-[8px] text-gray-400 truncate hidden sm:block">{card.description}</p>
                  </div>
                  <div className={cn(
                    "h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0 ml-1",
                    card.color === 'green' && "bg-green-100",
                    card.color === 'blue' && "bg-blue-100",
                    card.color === 'purple' && "bg-purple-100",
                    card.color === 'orange' && "bg-orange-100"
                  )}>
                    <Icon className={cn(
                      "h-3.5 w-3.5 sm:h-4 sm:w-4",
                      card.color === 'green' && "text-green-600",
                      card.color === 'blue' && "text-blue-600",
                      card.color === 'purple' && "text-purple-600",
                      card.color === 'orange' && "text-orange-600"
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Saldos resumidos */}
      {stats && (
        <div className="grid grid-cols-2 gap-2.5">
          {/* Saldo ARS */}
          <Card className={cn(
            "border-l-4 transition-all hover:bg-slate-50/50 active:scale-95 duration-200",
            stats.saldoTotal.ARS >= 0
              ? "border-l-green-500"
              : "border-l-red-500"
          )}>
            <CardContent className="p-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                    stats.saldoTotal.ARS >= 0 ? "bg-green-100" : "bg-red-100"
                  )}>
                    <TrendingUp className={cn("h-3.5 w-3.5", stats.saldoTotal.ARS >= 0 ? "text-green-600" : "text-red-600")} />
                  </div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Saldo ARS</p>
                </div>
                <div>
                  <p className={cn(
                    "text-sm sm:text-lg font-bold truncate tabular-nums",
                    stats.saldoTotal.ARS >= 0 ? "text-green-700" : "text-red-700"
                  )}>
                    {stats.saldoTotal.ARS >= 0 ? '' : '-'}${Math.abs(stats.saldoTotal.ARS).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saldo USD */}
          <Card className={cn(
            "border-l-4 transition-all hover:bg-slate-50/50 active:scale-95 duration-200",
            stats.saldoTotal.USD >= 0
              ? "border-l-green-500"
              : "border-l-red-500"
          )}>
            <CardContent className="p-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                    stats.saldoTotal.USD >= 0 ? "bg-green-100" : "bg-red-100"
                  )}>
                    <TrendingUp className={cn("h-3.5 w-3.5", stats.saldoTotal.USD >= 0 ? "text-green-600" : "text-red-600")} />
                  </div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Saldo USD</p>
                </div>
                <div>
                  <p className={cn(
                    "text-sm sm:text-lg font-bold truncate tabular-nums",
                    stats.saldoTotal.USD >= 0 ? "text-green-700" : "text-red-700"
                  )}>
                    {stats.saldoTotal.USD >= 0 ? '' : '-'}US$ {Math.abs(stats.saldoTotal.USD).toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

