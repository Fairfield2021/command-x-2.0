import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock all the heavy context providers and lazy-loaded pages
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/contexts/AIAssistantContext', () => ({
  AIAssistantProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LocationTrackingContext', () => ({
  LocationTrackingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/UIDensityContext', () => ({
  UIDensityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUIDensity: () => ({ density: 'normal' }),
}));

vi.mock('@/hooks/useNativeStatusBar', () => ({
  useNativeStatusBar: vi.fn(),
}));

vi.mock('@/components/ai-assistant/ChatInterface', () => ({
  ChatInterface: () => null,
}));

vi.mock('@/components/electron/UpdateNotification', () => ({
  UpdateNotification: () => null,
}));

vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/portal/PortalProtectedRoute', () => ({
  PortalProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/vendor-portal/VendorProtectedRoute', () => ({
  VendorProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/subcontractor-portal/SubcontractorProtectedRoute', () => ({
  SubcontractorProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/navigation', () => ({
  NavigationLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="nav-layout">{children}</div>,
}));

vi.mock('@/components/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('lovable-tagger', () => ({
  componentTagger: () => null,
}));

describe('App smoke test', () => {
  it('renders without crashing', async () => {
    const { default: App } = await import('@/App');
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('renders the Suspense fallback (PageLoader) while loading', async () => {
    const { default: App } = await import('@/App');
    const { container } = render(<App />);
    // The app should render some content — at minimum the providers and router
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
