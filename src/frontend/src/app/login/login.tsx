'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { AlertCircle, Mail, Lock } from 'lucide-react';
import AuthHero from '@/shared/components/auth/authhero';
import GlassCard, {IconInput} from '@/shared/components/ui/surface';

import { useAPI } from '@/shared/contexts/apicontext';

function Login({error: initialError}: {error?: string | null}) {
  const apiClient = useAPI();

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      try {
        await apiClient.login(email, password);
        window.location.href = '/';
        return { error: null };
      } catch (e: any) {
        return { error: e.message || 'Login failed' };
      }
    },
    { error: initialError }
  );

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

              {state.error && (
                <div className="alert alert-error mb-4">
                  <AlertCircle className="h-5 w-5" />
                  <span>{state.error}</span>
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Email</span></label>
                  <IconInput icon={Mail} type="email" name="email" placeholder="you@example.com" required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Password</span></label>
                  <IconInput icon={Lock} type="password" name="password" placeholder="Enter your password" minLength={8} required />
                </div>
                <button type="submit" className="btn btn-primary w-full gap-1 rounded-xl" disabled={isPending}>
                  {isPending ? <span className="loading loading-spinner"></span> : 'Log In'}
                </button>
              </form>

              <div className="divider my-4">or</div>

              <p className="text-center text-sm text-base-content/60">
                Don&apos;t have an account? <Link href="/signup" className="link link-primary font-medium">Sign Up</Link>
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default Login;
