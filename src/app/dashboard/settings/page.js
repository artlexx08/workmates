"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <section className="p-6 glass-panel rounded-2xl">
      <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
      <p className="text-wood-text-muted">
        Here you can configure your workshop profile, toggle offline simulation mode, and manage API keys.
      </p>
      {/* Placeholder content - expand as needed */}
    </section>
  );
}
