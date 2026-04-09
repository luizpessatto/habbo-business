'use client';

import dynamic from 'next/dynamic';

export const GameCanvas = dynamic(() => import('./GameCanvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#fff',
        fontFamily: 'monospace',
      }}
    >
      Loading AI Hotel...
    </div>
  ),
});
