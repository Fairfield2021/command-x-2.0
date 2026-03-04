import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobCostReport } from '../JobCostReport';
import type { JobCostSummary } from '@/hooks/useJobCostSummary';

const mockSummaries: JobCostSummary[] = [
  {
    project_id: 'p1',
    project_name: 'Highway Bridge',
    contract_id: 'c1',
    contract_status: 'active',
    original_value: 500000,
    addendum_value: 50000,
    deduction_value: 10000,
    total_contract_value: 540000,
    total_committed: 300000,
    total_billed: 200000,
    total_expenses: 250000,
    open_commitments: 50000,
    total_invoiced: 350000,
    total_remaining: 190000,
    gross_profit: 290000,
    margin_percent: 53.7,
    avg_percent_complete: 65,
    total_sov_lines: 10,
  },
  {
    project_id: 'p2',
    project_name: 'Office Renovation',
    contract_id: 'c2',
    contract_status: 'complete',
    original_value: 200000,
    addendum_value: 0,
    deduction_value: 0,
    total_contract_value: 200000,
    total_committed: 180000,
    total_billed: 200000,
    total_expenses: 170000,
    open_commitments: 0,
    total_invoiced: 200000,
    total_remaining: 0,
    gross_profit: 30000,
    margin_percent: 15.0,
    avg_percent_complete: 100,
    total_sov_lines: 5,
  },
];

// Mock the hook
vi.mock('@/hooks/useJobCostSummary', () => ({
  useAllJobCostSummaries: vi.fn(),
}));

// Mock formatCurrency
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    formatCurrency: (v: number) => `$${v.toLocaleString()}`,
  };
});

import { useAllJobCostSummaries } from '@/hooks/useJobCostSummary';

function renderReport() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <JobCostReport />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('JobCostReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while data is loading', () => {
    (useAllJobCostSummaries as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = renderReport();
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders summary cards with mock data', () => {
    (useAllJobCostSummaries as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockSummaries,
      isLoading: false,
    });

    renderReport();

    expect(screen.getByText('Total Contract Value')).toBeInTheDocument();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('Total Invoiced')).toBeInTheDocument();
    expect(screen.getByText('Total Gross Profit')).toBeInTheDocument();
  });

  it('renders project rows in the table', () => {
    (useAllJobCostSummaries as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockSummaries,
      isLoading: false,
    });

    renderReport();

    expect(screen.getByText('Highway Bridge')).toBeInTheDocument();
    expect(screen.getByText('Office Renovation')).toBeInTheDocument();
  });

  it('renders CSV export button', () => {
    (useAllJobCostSummaries as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockSummaries,
      isLoading: false,
    });

    renderReport();

    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('renders status filter with options', () => {
    (useAllJobCostSummaries as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockSummaries,
      isLoading: false,
    });

    renderReport();

    // The select trigger should show the default "All Statuses" value
    expect(screen.getByText('All Statuses')).toBeInTheDocument();
  });

  it('shows totals row in the footer', () => {
    (useAllJobCostSummaries as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockSummaries,
      isLoading: false,
    });

    renderReport();

    expect(screen.getByText('Totals (2)')).toBeInTheDocument();
  });

  it('shows empty state when no data matches filter', () => {
    (useAllJobCostSummaries as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderReport();

    expect(screen.getByText('No projects match the selected filter')).toBeInTheDocument();
  });
});
