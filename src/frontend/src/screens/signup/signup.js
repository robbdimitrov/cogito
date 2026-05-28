import React, {useState} from 'react';
import Link from '../../shared/router/link';

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
  const passwordValid = !state.password || state.password.length >= 4;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-200">
        <div className="card-body">
          <h1 className="card-title text-2xl justify-center mb-2">Create Account</h1>
          <p className="text-center text-base-content/60 mb-6">Join the conversation</p>

          {error && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Name</span></label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <input className="input input-bordered w-full pl-10" type="text" name="name" placeholder="Your name" onChange={handleInputChange} value={state.name} required />
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Username</span></label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <input className="input input-bordered w-full pl-10" type="text" name="username" placeholder="@username" onChange={handleInputChange} value={state.username} required />
              </div>
              {!usernameValid && <span className="label-text-alt text-error mt-1">Letters, numbers, underscores only</span>}
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Email</span></label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <input className="input input-bordered w-full pl-10" type="email" name="email" placeholder="you@example.com" onChange={handleInputChange} value={state.email} required />
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Password</span></label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <input className="input input-bordered w-full pl-10" type="password" name="password" placeholder="••••••••" minLength="4" onChange={handleInputChange} value={state.password} required />
              </div>
              {!passwordValid && <span className="label-text-alt text-error mt-1">At least 4 characters</span>}
            </div>
            <button type="submit" className="btn btn-primary w-full gap-1" disabled={isSubmitting || !usernameValid || !passwordValid}>
              {isSubmitting ? <span className="loading loading-spinner"></span> : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
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
