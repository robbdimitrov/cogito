import React, {useState} from 'react';
import Link from '../../shared/router/link';
import { MessageSquare, Check, AlertCircle, Mail, Lock } from 'lucide-react';

function Login({loginUser, error}) {
  const [state, setState] = useState({email: '', password: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const {email, password} = state;
    loginUser(email, password).finally(() => setIsSubmitting(false));
  }

  function handleInputChange(event) {
    const {name, value} = event.target;
    setState((s) => ({...s, [name]: value}));
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-secondary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px'}}></div>
        <div className="relative text-center text-primary-content">
          <MessageSquare className="h-24 w-24 mx-auto mb-8 opacity-80" />
          <h1 className="text-4xl font-extrabold mb-4">Thoughts</h1>
          <p className="text-xl opacity-90 mb-8">Share your thoughts with the world</p>
          <div className="space-y-4 text-left max-w-xs mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="h-4 w-4" />
              </div>
              <span>Share ideas and insights</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="h-4 w-4" />
              </div>
              <span>Follow interesting people</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="h-4 w-4" />
              </div>
              <span>Build your community</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl font-extrabold text-primary">Thoughts</span>
          </div>
          <div className="card rounded-2xl border border-white/60 bg-base-100/80 shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
            <div className="card-body">
              <h1 className="card-title text-2xl mb-1">Welcome Back</h1>
              <p className="text-base-content/60 mb-6">Log in to continue the conversation</p>

              {error && (
                <div className="alert alert-error mb-4">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Email</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" />
                    <input className="input input-bordered w-full rounded-xl bg-base-100/30 pl-10 transition-all duration-300 focus:border-primary/60 focus:ring-4 focus:ring-primary/10" type="email" name="email" placeholder="you@example.com" onChange={handleInputChange} value={state.email} required />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Password</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" />
                    <input className="input input-bordered w-full rounded-xl bg-base-100/30 pl-10 transition-all duration-300 focus:border-primary/60 focus:ring-4 focus:ring-primary/10" type="password" name="password" placeholder="Enter your password" minLength="8" onChange={handleInputChange} value={state.password} required />
                  </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
