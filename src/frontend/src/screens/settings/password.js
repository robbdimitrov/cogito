import React, {useState, useEffect} from 'react';
import { AlertCircle } from 'lucide-react';

function Password(props) {
  const [state, setState] = useState({password: '', oldPassword: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (props.error) {
      setIsSubmitting(false);
    }
  }, [props.error]);

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const {password, oldPassword} = state;
    props.updatePassword(password, oldPassword).finally(() => setIsSubmitting(false));
  }

  function handleInputChange(event) {
    const {name, value} = event.target;
    setState((s) => ({...s, [name]: value}));
  }

  return (
    <div className="card glass-card rounded-2xl animate-slide-in">
      <div className="card-body gap-5 p-5 sm:p-6">
        <h1 className="text-2xl font-semibold leading-tight">Change Password</h1>

        {props.error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{props.error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-control">
            <label className="label" htmlFor="current-password"><span className="label-text text-sm font-medium">Current Password</span></label>
            <input id="current-password" className="input input-bordered min-h-12 w-full glow-input bg-base-100/30 rounded-xl text-base" type="password" name="oldPassword" placeholder="Current password" minLength="8" value={state.oldPassword} onChange={handleInputChange} required autoComplete="current-password" />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="new-password"><span className="label-text text-sm font-medium">New Password</span></label>
            <input id="new-password" className="input input-bordered min-h-12 w-full glow-input bg-base-100/30 rounded-xl text-base" type="password" name="password" placeholder="New password" minLength="8" value={state.password} onChange={handleInputChange} required autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary min-h-12 rounded-xl px-5 text-base" disabled={isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner" aria-label="Updating"></span> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Password;
