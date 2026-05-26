import React from 'react';

export default function GlassPanel({ children, className = '' }) {
  return (
    <div className={`glass-panel glass-panel-hover rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  );
}
