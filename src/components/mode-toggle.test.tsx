import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModeToggle } from './mode-toggle';

// Mock the bio-mode store
vi.mock('~/lib/stores/bio-mode', () => ({
  bioMode: {
    get: vi.fn(() => 'full'),
    listen: vi.fn(),
    subscribe: vi.fn(),
  },
  toggleBioMode: vi.fn(),
}));

// Mock useStore hook
vi.mock('@nanostores/react', () => ({
  useStore: vi.fn((store) => {
    // Return the mocked value from the store
    return store.get();
  }),
}));

describe('ModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component', () => {
    render(<ModeToggle />);
    expect(screen.getByText('Bio mode')).toBeInTheDocument();
  });

  it('should render toggle button with correct accessibility label', () => {
    render(<ModeToggle />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(
      screen.getByText('Toggle between full biography and TL;DR views')
    ).toBeInTheDocument();
  });

  it('should have correct data attributes when in full mode', async () => {
    const { useStore } = await import('@nanostores/react');
    vi.mocked(useStore).mockReturnValue('full');

    render(<ModeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-state', 'full');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('should have correct data attributes when in tldr mode', async () => {
    const { useStore } = await import('@nanostores/react');
    vi.mocked(useStore).mockReturnValue('tldr');

    render(<ModeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-state', 'tldr');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('should call toggleBioMode when button is clicked', async () => {
    const { toggleBioMode } = await import('~/lib/stores/bio-mode');
    const user = userEvent.setup();

    render(<ModeToggle />);
    const button = screen.getByRole('button');

    await user.click(button);

    expect(toggleBioMode).toHaveBeenCalledTimes(1);
  });

  it('should display appropriate toggle text', () => {
    render(<ModeToggle />);
    expect(screen.getByText('Switch to TL;DR')).toBeInTheDocument();
    expect(screen.getByText('Switch to full bio')).toBeInTheDocument();
  });

  it('should have proper button type attribute', () => {
    render(<ModeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should render controller div with correct data attributes', async () => {
    const { useStore } = await import('@nanostores/react');
    vi.mocked(useStore).mockReturnValue('full');

    const { container } = render(<ModeToggle />);
    const controller = container.querySelector('[data-mode-controller]');

    expect(controller).toBeInTheDocument();
    expect(controller).toHaveAttribute('data-state', 'full');
  });
});
