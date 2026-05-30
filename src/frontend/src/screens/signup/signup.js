import React, {useState} from 'react';
import Link from '../../shared/router/link';
import { AlertCircle, User, Mail, Lock, UserPlus } from 'lucide-react';

function Signup({registerUser, error}) {
  const [state, setState] = useState({name: '', username: '', email: '', password: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const {name, username, email, password} = state;
    registerUser(name, username, email, password).finally(() => setIsSubmitting(false));
  }

  function handleInputChange(event) {
    const {name, value} = event.target;
    setState((s) => ({...s, [name]: value}));
  }

  const usernameValid = !state.username || /^[a-zA-Z0-9_]+$/.test(state.username);
  const passwordValid = !state.password || state.password.length >= 8;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md glass-card rounded-2xl animate-slide-in">
        <div className="card-body">
          <h1 className="card-title text-2xl justify-center mb-2">Create Account</h1>
          <p className="text-center text-base-content/60 mb-6">Join the conversation</p>

          {error && (
            <div className="alert alert-error mb-4">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Name</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" />
                <input className="input input-bordered w-full pl-10 glow-input bg-base-100/30 rounded-xl" type="text" name="name" placeholder="Your name" onChange={handleInputChange} value={state.name} required />
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Username</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" />
                <input className="input input-bordered w-full pl-10 glow-input bg-base-100/30 rounded-xl" type="text" name="username" placeholder="@username" onChange={handleInputChange} value={state.username} required />
              </div>
              {!usernameValid && <span className="label-text-alt text-error mt-1">Letters, numbers, underscores only</span>}
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Email</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" />
                <input className="input input-bordered w-full pl-10 glow-input bg-base-100/30 rounded-xl" type="email" name="email" placeholder="you@example.com" onChange={handleInputChange} value={state.email} required />
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Password</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" />
                <input className="input input-bordered w-full pl-10 glow-input bg-base-100/30 rounded-xl" type="password" name="password" placeholder="••••••••" minLength="4" onChange={handleInputChange} value={state.password} required />
              </div>
              {!passwordValid && <span className="label-text-alt text-error mt-1">At least 8 characters</span>}
            </div>
            <button type="submit" className="btn btn-primary w-full gap-1 rounded-xl" disabled={isSubmitting || !usernameValid || !passwordValid}>
              {isSubmitting ? <span className="loading loading-spinner"></span> : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="divider">or</div>

          <p className="text-center text-sm">
            Already have an account? <Link href="/login" className="link link-primary">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
