'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, User, Mail, Lock, UserPlus } from 'lucide-react';
import AuthHero from '@/shared/components/auth/authhero';
import GlassCard, {IconInput} from '@/shared/components/ui/surface';

import { useAPI } from '@/shared/contexts/apicontext';

function Signup({error: initialError}: {error?: string | null}) {
  const apiClient = useAPI();
  const [fields, setFields] = useState({name: '', username: '', email: '', password: ''});
  const [result, formAction, isPending] = useActionState(
    async (_previous: {error?: string | null}, formData: FormData) => {
      const name = formData.get('name') as string;
      const username = formData.get('username') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      try {
        await apiClient.createUser(name, username, email, password);
        await apiClient.login(email, password);
        window.location.href = '/';
        return {error: null};
      } catch (e: any) {
        return {error: e.message || 'Signup failed'};
      }
    },
    {error: initialError}
  );

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const {name, value} = event.target;
    setFields((current) => ({...current, [name]: value}));
  }

  const usernameValid = !fields.username || /^[a-zA-Z0-9_]+$/.test(fields.username);
  const passwordValid = !fields.password || fields.password.length >= 8;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      <AuthHero
        eyebrow="Start here"
        title="Thoughts"
        description="Create a space for quick ideas and real conversations."
        points={[
          'Claim your profile and username',
          'Post thoughts as they happen',
          'Find people worth following',
        ]}
      />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <GlassCard>
            <div className="card-body">
              <h1 className="card-title text-2xl mb-1">Create your account</h1>
              <p className="text-base-content/60 mb-6">Set up your profile and start posting.</p>

              {result.error && (
                <div className="alert alert-error mb-4">
                  <AlertCircle className="h-5 w-5" />
                  <span>{result.error}</span>
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Name</span></label>
                  <IconInput icon={User} type="text" name="name" placeholder="Your name" value={fields.name} onChange={handleInputChange} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Username</span></label>
                  <IconInput icon={User} type="text" name="username" placeholder="@username" value={fields.username} onChange={handleInputChange} required />
                  {!usernameValid && <span className="label-text-alt text-error mt-1">Letters, numbers, underscores only</span>}
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Email</span></label>
                  <IconInput icon={Mail} type="email" name="email" placeholder="you@example.com" value={fields.email} onChange={handleInputChange} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Password</span></label>
                  <IconInput icon={Lock} type="password" name="password" placeholder="Enter your password" minLength={8} value={fields.password} onChange={handleInputChange} required />
                  {!passwordValid && <span className="label-text-alt text-error mt-1">At least 8 characters</span>}
                </div>
                <button type="submit" className="btn btn-primary w-full gap-1 rounded-xl" disabled={isPending || !usernameValid || !passwordValid}>
                  {isPending ? <span className="loading loading-spinner"></span> : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create account
                    </>
                  )}
                </button>
              </form>

              <div className="divider my-4">or</div>

              <p className="text-center text-sm text-base-content/60">
                Already have an account? <Link href="/login" className="link link-primary font-medium">Log In</Link>
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default Signup;
