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
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body">
        <h2 className="card-title text-xl mb-4">Change Password</h2>

        {props.error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="h-5 w-5" />
            <span>{props.error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Current Password</span></label>
                    <input className="input input-bordered" type="password" name="oldPassword" placeholder="Current password" minLength="8" value={state.oldPassword} onChange={handleInputChange} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">New Password</span></label>
                    <input className="input input-bordered" type="password" name="password" placeholder="New password" minLength="8" value={state.password} onChange={handleInputChange} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner"></span> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Password;
