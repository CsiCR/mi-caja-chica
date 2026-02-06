

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, CreditCard, ArrowUpDown, FileText, TrendingUp, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      description: 'Emprendimientos registrados'
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
      description: 'Movimientos registrados'
    },
    {
      title: 'Asientos Contables',
      value: stats?.asientos || 0,
      icon: FileText,
      color: 'orange',
      href: '/dashboard/asientos',
      description: 'Categorías contables'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header con botón de refresh */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Resumen Financiero</h2>
        <Button
          onClick={() => fetchStats(true)}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {refreshing ? 'Actualizando...' : 'Actualizar Saldos'}
        </Button>
      </div>
      
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105",
                "border-l-4",
                card.color === 'green' && "border-l-green-500 hover:bg-green-50",
                card.color === 'blue' && "border-l-blue-500 hover:bg-blue-50",
                card.color === 'purple' && "border-l-purple-500 hover:bg-purple-50",
                card.color === 'orange' && "border-l-orange-500 hover:bg-orange-50"
              )}
              onClick={() => router.push(card.href)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      card.color === 'green' && "text-green-700",
                      card.color === 'blue' && "text-blue-700",
                      card.color === 'purple' && "text-purple-700",
                      card.color === 'orange' && "text-orange-700"
                    )}>
                      {loading ? '...' : card.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                  </div>
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center",
                    card.color === 'green' && "bg-green-100",
                    card.color === 'blue' && "bg-blue-100",
                    card.color === 'purple' && "bg-purple-100",
                    card.color === 'orange' && "bg-orange-100"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Saldo ARS */}
          <Card className={cn(
            "border-l-4 transition-all",
            stats.saldoTotal.ARS >= 0 
              ? "border-l-green-500 hover:shadow-lg" 
              : "border-l-red-500 hover:shadow-lg"
          )}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center",
                  stats.saldoTotal.ARS >= 0 
                    ? "bg-green-100" 
                    : "bg-red-100"
                )}>
                  <TrendingUp className={cn(
                    "h-6 w-6",
                    stats.saldoTotal.ARS >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Saldo Total ARS</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    stats.saldoTotal.ARS >= 0 
                      ? "text-green-700" 
                      : "text-red-700"
                  )}>
                    {stats.saldoTotal.ARS >= 0 ? '' : '-'}${Math.abs(stats.saldoTotal.ARS).toLocaleString('es-AR')}
                  </p>
                  {stats.saldoTotal.ARS < 0 && (
                    <p className="text-xs text-red-600 mt-1">Saldo negativo</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saldo USD */}
          <Card className={cn(
            "border-l-4 transition-all",
            stats.saldoTotal.USD >= 0 
              ? "border-l-green-500 hover:shadow-lg" 
              : "border-l-red-500 hover:shadow-lg"
          )}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center",
                  stats.saldoTotal.USD >= 0 
                    ? "bg-green-100" 
                    : "bg-red-100"
                )}>
                  <TrendingUp className={cn(
                    "h-6 w-6",
                    stats.saldoTotal.USD >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Saldo Total USD</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    stats.saldoTotal.USD >= 0 
                      ? "text-green-700" 
                      : "text-red-700"
                  )}>
                    {stats.saldoTotal.USD >= 0 ? '' : '-'}US$ {Math.abs(stats.saldoTotal.USD).toLocaleString('en-US')}
                  </p>
                  {stats.saldoTotal.USD < 0 && (
                    <p className="text-xs text-red-600 mt-1">Saldo negativo</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transacciones pendientes */}
      {stats?.transaccionesPendientes && stats.transaccionesPendientes > 0 && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ArrowUpDown className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Transacciones Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.transaccionesPendientes}</p>
                  <p className="text-sm text-yellow-600">Requieren tu atención</p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/dashboard/reportes?tab=vencimientos')}
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Ver Vencimientos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

