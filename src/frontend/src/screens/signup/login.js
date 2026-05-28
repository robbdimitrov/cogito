import React, {useState} from 'react';
import Link from '../../shared/router/link';

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
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-200">
        <div className="card-body">
          <h1 className="card-title text-2xl justify-center mb-2">Welcome Back</h1>
          <p className="text-center text-base-content/60 mb-6">Log in to access your account</p>

          {error && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Email</span></label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <input
                  className="input input-bordered w-full pl-10"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  onChange={handleInputChange}
                  value={state.email}
                  required
                />
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Password</span></label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <input
                  className="input input-bordered w-full pl-10"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  minLength="4"
                  onChange={handleInputChange}
                  value={state.password}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full gap-1" disabled={isSubmitting}>
              {isSubmitting ? <span className="loading loading-spinner"></span> : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  Log In
                </>
              )}
            </button>
          </form>

          <div className="divider">or</div>

          <p className="text-center text-sm">
            Don't have an account? <Link href="/signup" className="link link-primary">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
