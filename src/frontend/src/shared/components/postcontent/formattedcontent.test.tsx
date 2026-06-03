import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormattedContent from './formattedcontent';

describe('FormattedContent', () => {
  it('renders plain text correctly', () => {
    const { container } = render(<FormattedContent content="Just some plain text" />);
    expect(container.textContent).toBe('Just some plain text');
  });

  it('renders hashtags as links', () => {
    render(<FormattedContent content="Hello #world and #React" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe('#world');
    expect(links[0].getAttribute('href')).toBe('/hashtags/world');
    expect(links[1].textContent).toBe('#React');
    expect(links[1].getAttribute('href')).toBe('/hashtags/react'); // should be lowercase
  });

  it('renders mentions as links', () => {
    render(<FormattedContent content="Hello @user and @Admin" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe('@user');
    expect(links[0].getAttribute('href')).toBe('/@user');
    expect(links[1].textContent).toBe('@Admin');
    expect(links[1].getAttribute('href')).toBe('/@Admin'); // Mentions might keep casing, check component logic
  });

  it('renders urls as links', () => {
    render(<FormattedContent content="Check out https://example.com/foo?bar=1" />);
    const link = screen.getByRole('link');
    expect(link.textContent).toBe('https://example.com/foo?bar=1');
    expect(link.getAttribute('href')).toBe('https://example.com/foo?bar=1');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('excludes trailing punctuation from urls', () => {
    render(<FormattedContent content="Go to https://google.com. Also https://test.com," />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe('https://google.com');
    expect(links[1].textContent).toBe('https://test.com');
  });

  it('handles multiple identical tokens without global regex interference', () => {
    render(<FormattedContent content="Hello #test #test #test" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0].textContent).toBe('#test');
    expect(links[1].textContent).toBe('#test');
    expect(links[2].textContent).toBe('#test');
  });
});
