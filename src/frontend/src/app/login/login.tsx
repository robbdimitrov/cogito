'use client';

import React, {useState} from 'react';
import Link from 'next/link';
import { AlertCircle, Mail, Lock } from 'lucide-react';
import AuthHero from '@/shared/components/auth/authhero';
import GlassCard, {IconInput} from '@/shared/components/ui/surface';

import { useAPI } from '@/shared/contexts/apicontext';

function Login({error: initialError}: {error?: string | null}) {
  const apiClient = useAPI();
  const [state, setState] = useState({email: '', password: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(initialError);

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const {email, password} = state;
    apiClient.login(email, password)
      .then(() => {
        window.location.href = '/';
      })
      .catch((e) => {
        setError(e.message || 'Login failed');
        setIsSubmitting(false);
      });
  }

  function handleInputChange(event) {
    const {name, value} = event.target;
    setState((s) => ({...s, [name]: value}));
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      <AuthHero
        eyebrow="Welcome back"
        title="Thoughts"
        description="Pick up where the conversation left off."
        points={[
          'Share ideas before they fade',
          'Keep up with people you follow',
          'Return to replies, likes, and reposts',
        ]}
      />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <GlassCard>
            <div className="card-body">
              <h1 className="card-title text-2xl mb-1">Welcome back</h1>
              <p className="text-base-content/60 mb-6">Log in to keep the conversation moving.</p>

              {error && (
                <div className="alert alert-error mb-4">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Email</span></label>
                  <IconInput icon={Mail} type="email" name="email" placeholder="you@example.com" onChange={handleInputChange} value={state.email} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Password</span></label>
                  <IconInput icon={Lock} type="password" name="password" placeholder="Enter your password" minLength={8} onChange={handleInputChange} value={state.password} required />
                </div>
                <button type="submit" className="btn btn-primary w-full gap-1 rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? <span className="loading loading-spinner"></span> : 'Log In'}
                </button>
              </form>

              <div className="divider my-4">or</div>

              <p className="text-center text-sm text-base-content/60">
                Don't have an account? <Link href="/signup" className="link link-primary font-medium">Sign Up</Link>
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default Login;
