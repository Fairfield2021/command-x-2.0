import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useJobCostSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase with correct table and project ID', async () => {
    const mockData = {
      project_id: 'proj-1',
      project_name: 'Test Project',
      total_contract_value: 100000,
      gross_profit: 20000,
      margin_percent: 20,
    };

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

    const { useJobCostSummary } = await import('@/hooks/useJobCostSummary');
    const { result } = renderHook(() => useJobCostSummary('proj-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('job_cost_summary');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('project_id', 'proj-1');
    expect(result.current.data).toEqual(mockData);
  });

  it('does not fetch when projectId is null', async () => {
    const { useJobCostSummary } = await import('@/hooks/useJobCostSummary');
    const { result } = renderHook(() => useJobCostSummary(null), {
      wrapper: createWrapper(),
    });

    // With enabled: false, the query should stay in pending/idle state and never fetch
    expect(result.current.fetchStatus).toBe('idle');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('useAllJobCostSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all summaries from job_cost_summary table', async () => {
    const mockData = [
      { project_id: 'p1', project_name: 'Project A', total_contract_value: 50000 },
      { project_id: 'p2', project_name: 'Project B', total_contract_value: 75000 },
    ];

    const mockSelect = vi.fn().mockResolvedValue({ data: mockData, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

    const { useAllJobCostSummaries } = await import('@/hooks/useJobCostSummary');
    const { result } = renderHook(() => useAllJobCostSummaries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('job_cost_summary');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(result.current.data).toEqual(mockData);
  });
});
