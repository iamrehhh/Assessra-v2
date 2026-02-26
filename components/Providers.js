'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from './ToastContext';
import { ConfirmProvider } from './ConfirmContext';

export default function Providers({ children }) {
    return (
        <SessionProvider>
            <ToastProvider>
                <ConfirmProvider>
                    {children}
                </ConfirmProvider>
            </ToastProvider>
        </SessionProvider>
    );
}
