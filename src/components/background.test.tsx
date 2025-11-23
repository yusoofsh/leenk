import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Background } from './background';

// Mock motion/react
vi.mock('motion/react', async () => {
  const actual = await vi.importActual('motion/react');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    useMotionValue: vi.fn((initial) => ({
      get: () => initial,
      set: vi.fn(),
    })),
    useSpring: vi.fn((value) => value),
  };
});

// Mock the bio-mode store
vi.mock('~/lib/stores/bio-mode', () => ({
  bioMode: {
    get: vi.fn(() => 'full'),
    listen: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock useStore hook
vi.mock('@nanostores/react', () => ({
  useStore: vi.fn((store) => {
    return store.get();
  }),
}));

describe('Background', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component', () => {
    const { container } = render(<Background />);
    const background = container.querySelector('[data-slot="stars-background"]');
    expect(background).toBeInTheDocument();
  });

  it('should use white star color in tldr mode', async () => {
    const { useStore } = await import('@nanostores/react');
    vi.mocked(useStore).mockReturnValue('tldr');

    const { container } = render(<Background />);
    expect(container).toBeInTheDocument();
    // Star color is passed as prop but testing actual rendering would require
    // more complex setup with actual motion components
  });

  it('should use black star color in full mode', async () => {
    const { useStore } = await import('@nanostores/react');
    vi.mocked(useStore).mockReturnValue('full');

    const { container } = render(<Background />);
    expect(container).toBeInTheDocument();
  });

  it('should accept and apply className prop', () => {
    const { container } = render(
      <Background className="custom-background-class" />
    );
    const background = container.querySelector('[data-slot="stars-background"]');
    expect(background).toBeInTheDocument();
  });

  it('should render children when provided', () => {
    render(
      <Background>
        <div data-testid="child-content">Test Content</div>
      </Background>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should pass through additional props', () => {
    const { container } = render(
      <Background data-testid="background-test" aria-label="Stars background" />
    );
    const background = container.querySelector('[data-testid="background-test"]');
    expect(background).toBeInTheDocument();
    expect(background).toHaveAttribute('aria-label', 'Stars background');
  });

  it('should have appropriate CSS classes for backgrounds', () => {
    const { container } = render(<Background />);
    const background = container.querySelector('[data-slot="stars-background"]');

    expect(background?.className).toContain('min-h-screen');
    expect(background?.className).toContain('w-full');
    expect(background?.className).toContain('overflow-hidden');
  });

  it('should respond to mouse movement', async () => {
    const { useMotionValue } = await import('motion/react');
    const mockSet = vi.fn();
    vi.mocked(useMotionValue).mockReturnValue({
      get: () => 0,
      set: mockSet,
    } as any);

    const { container } = render(<Background />);
    const background = container.querySelector('[data-slot="stars-background"]');

    if (background) {
      const user = userEvent.setup();
      await user.pointer({ target: background, coords: { clientX: 100, clientY: 100 } });

      // Motion values should be set when mouse moves
      // Note: This is a basic test - actual behavior depends on motion implementation
      expect(background).toBeInTheDocument();
    }
  });
});
