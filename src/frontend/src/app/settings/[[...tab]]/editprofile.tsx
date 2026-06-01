import React, {useState, useEffect} from 'react';
import { AlertCircle } from 'lucide-react';
import GlassCard, {Field, FormInput, FormTextArea} from '@/shared/components/ui/surface';

function EditProfile(props) {
  const [state, setState] = useState({
    name: props.user.name,
    username: props.user.username,
    email: props.user.email,
    bio: props.user.bio,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setState({
      name: props.user.name,
      username: props.user.username,
      email: props.user.email,
      bio: props.user.bio,
    });
  }, [props.user]);

  useEffect(() => {
    if (props.error) {
      setIsSubmitting(false);
    }
  }, [props.error]);

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const {name, username, email, bio} = state;
    props.updateUser(name, username, email, bio).finally(() => setIsSubmitting(false));
  }

  function handleInputChange(event) {
    const {name, value} = event.target;
    setState((s) => ({...s, [name]: value}));
  }

  return (
    <GlassCard>
      <div className="card-body gap-4 p-4 sm:gap-5 sm:p-6">
        <h1 className="text-xl font-semibold leading-tight sm:text-2xl">Edit Profile</h1>

        {props.error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{props.error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <Field id="settings-name" label="Name">
            <FormInput id="settings-name" type="text" name="name" placeholder="Name" value={state.name} onChange={handleInputChange} required autoComplete="name" />
          </Field>
          <Field id="settings-username" label="Username">
            <FormInput id="settings-username" type="text" name="username" placeholder="Username" value={state.username} onChange={handleInputChange} required autoComplete="username" />
          </Field>
          <Field id="settings-email" label="Email">
            <FormInput id="settings-email" type="email" name="email" placeholder="Email" value={state.email} onChange={handleInputChange} required autoComplete="email" />
          </Field>
          <Field id="settings-bio" label="Bio">
            <FormTextArea id="settings-bio" name="bio" placeholder="Tell us about yourself" value={state.bio} onChange={handleInputChange} rows={4} />
          </Field>
          <button type="submit" className="btn btn-primary min-h-12 rounded-xl px-5 text-base" disabled={isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner" aria-label="Saving"></span> : 'Save Changes'}
          </button>
        </form>
      </div>
    </GlassCard>
  );
}

export default EditProfile;
