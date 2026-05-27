import React, {useState} from 'react';
import Link from '../../shared/router/link';

function Login({loginUser, error}) {
  const [state, setState] = useState({email: '', password: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const {email, password} = state;
    loginUser(email, password);
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
              <input
                className="input input-bordered"
                type="email"
                name="email"
                placeholder="you@example.com"
                onChange={handleInputChange}
                value={state.email}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Password</span></label>
              <input
                className="input input-bordered"
                type="password"
                name="password"
                placeholder="••••••••"
                minLength="4"
                onChange={handleInputChange}
                value={state.password}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? <span className="loading loading-spinner"></span> : 'Log In'}
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
