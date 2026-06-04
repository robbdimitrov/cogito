import {useState} from 'react';
import { AlertCircle } from 'lucide-react';
import GlassCard, {Field, FormInput} from '@/shared/components/ui/surface';

function Password(props) {
  const [state, setState] = useState({password: '', oldPassword: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <GlassCard>
      <div className="card-body gap-4 p-4 sm:gap-5 sm:p-6">
        <h1 className="text-xl font-semibold leading-tight sm:text-2xl">Change Password</h1>

        {props.error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{props.error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <Field id="current-password" label="Current Password">
            <FormInput id="current-password" type="password" name="oldPassword" placeholder="Current password" minLength={8} value={state.oldPassword} onChange={handleInputChange} required autoComplete="current-password" />
          </Field>
          <Field id="new-password" label="New Password">
            <FormInput id="new-password" type="password" name="password" placeholder="New password" minLength={8} value={state.password} onChange={handleInputChange} required autoComplete="new-password" />
          </Field>
          <button type="submit" className="btn btn-primary min-h-12 rounded-xl px-5 text-base" disabled={isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner" aria-label="Updating"></span> : 'Update Password'}
          </button>
        </form>
      </div>
    </GlassCard>
  );
}

export default Password;
