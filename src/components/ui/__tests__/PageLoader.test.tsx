import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLoader } from '../PageLoader';

describe('PageLoader', () => {
  it('renders without crashing', () => {
    const { container } = render(<PageLoader />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a centered full-screen container', () => {
    const { container } = render(<PageLoader />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('h-screen');
    expect(wrapper.className).toContain('items-center');
    expect(wrapper.className).toContain('justify-center');
  });

  it('renders a spinning loading indicator', () => {
    const { container } = render(<PageLoader />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.className.baseVal || svg?.getAttribute('class')).toContain('animate-spin');
  });
});
