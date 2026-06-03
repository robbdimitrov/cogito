import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GlassCard, { Field, FormInput, cx } from './surface';

describe('surface components', () => {
  describe('cx utility', () => {
    it('should join classes and filter out falsy values', () => {
      expect(cx('class1', 'class2', false, null, undefined, 'class3')).toBe('class1 class2 class3');
    });
  });

  describe('GlassCard', () => {
    it('renders with children and default component (div)', () => {
      render(<GlassCard data-testid="glass-card">Content</GlassCard>);
      const card = screen.getByTestId('glass-card');
      expect(card).toBeInTheDocument();
      expect(card.tagName.toLowerCase()).toBe('div');
      expect(card).toHaveTextContent('Content');
      expect(card).toHaveClass('card', 'rounded-2xl', 'backdrop-blur-2xl');
    });

    it('renders as a different component when "as" prop is provided', () => {
      render(<GlassCard as="section" data-testid="glass-card-section">Content</GlassCard>);
      const card = screen.getByTestId('glass-card-section');
      expect(card.tagName.toLowerCase()).toBe('section');
    });

    it('adds interactive classes when interactive prop is true', () => {
      render(<GlassCard interactive data-testid="glass-card-interactive">Content</GlassCard>);
      const card = screen.getByTestId('glass-card-interactive');
      expect(card).toHaveClass('hover:bg-base-100/95');
    });
  });

  describe('Field', () => {
    it('renders a label and children', () => {
      render(
        <Field id="test-field" label="Test Label">
          <input id="test-field" type="text" />
        </Field>
      );
      
      const label = screen.getByText('Test Label');
      expect(label).toBeInTheDocument();
      expect(label.closest('label')).toHaveAttribute('for', 'test-field');
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'test-field');
    });
  });

  describe('FormInput', () => {
    it('renders an input with default classes', () => {
      render(<FormInput data-testid="form-input" />);
      const input = screen.getByTestId('form-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('input', 'input-bordered');
    });
    
    it('appends custom className', () => {
      render(<FormInput data-testid="form-input" className="custom-class" />);
      const input = screen.getByTestId('form-input');
      expect(input).toHaveClass('input', 'custom-class');
    });
  });
});
