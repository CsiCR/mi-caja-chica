
'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './theme-provider';
import { AutoLogout } from './auth/auto-logout';
import { GlobalNotificationHandler } from './notifications/global-notification-handler';
import { ReactNode, useEffect, useState } from 'react';
import { TooltipProvider } from './ui/tooltip';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={300}>
          {mounted && <GlobalNotificationHandler />}
          <AutoLogout />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
