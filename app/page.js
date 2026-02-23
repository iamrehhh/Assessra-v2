'use client';

import { useSession } from 'next-auth/react';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <Dashboard />;
}
