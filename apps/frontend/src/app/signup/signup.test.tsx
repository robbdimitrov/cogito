import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import Signup from './signup';

vi.mock('@/shared/contexts/apicontext', () => ({
  useAPI: () => ({
    createUser: vi.fn(),
    login: vi.fn(),
  }),
}));

describe('Signup', () => {
  it('validates the current username and password values', () => {
    render(<Signup />);

    const username = screen.getByPlaceholderText('@username');
    const password = screen.getByPlaceholderText('Enter your password');
    const submit = screen.getByRole('button', {name: 'Create account'});

    fireEvent.change(username, {target: {value: 'invalid/user'}});

    expect(screen.getByText('Letters, numbers, underscores only')).toBeInTheDocument();
    expect(submit).toBeDisabled();

    fireEvent.change(username, {target: {value: 'valid_user'}});
    fireEvent.change(password, {target: {value: 'short'}});

    expect(screen.queryByText('Letters, numbers, underscores only')).not.toBeInTheDocument();
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });
});
