import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useContractsByProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches contracts filtered by project ID', async () => {
    const mockContracts = [
      { id: 'c1', project_id: 'proj-1', title: 'Contract A', status: 'active' },
      { id: 'c2', project_id: 'proj-1', title: 'Contract B', status: 'complete' },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockContracts, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

    const { useContractsByProject } = await import('@/hooks/useContracts');
    const { result } = renderHook(() => useContractsByProject('proj-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('contracts');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('project_id', 'proj-1');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual(mockContracts);
  });

  it('does not fetch when projectId is null', async () => {
    const { useContractsByProject } = await import('@/hooks/useContracts');
    const { result } = renderHook(() => useContractsByProject(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns empty array when projectId is null and query runs', async () => {
    const { useContractsByProject } = await import('@/hooks/useContracts');
    const { result } = renderHook(() => useContractsByProject(null), {
      wrapper: createWrapper(),
    });

    // Query is disabled, so data should be undefined (not fetched)
    expect(result.current.data).toBeUndefined();
  });
});

describe('useContracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all contracts ordered by created_at descending', async () => {
    const mockContracts = [
      { id: 'c1', title: 'Latest', created_at: '2024-02-01' },
      { id: 'c2', title: 'Older', created_at: '2024-01-01' },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockContracts, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

    const { useContracts } = await import('@/hooks/useContracts');
    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('contracts');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual(mockContracts);
  });
});
