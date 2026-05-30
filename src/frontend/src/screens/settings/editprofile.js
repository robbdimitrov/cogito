import React, {useState, useEffect} from 'react';
import { AlertCircle } from 'lucide-react';

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
    <div className="card glass-card rounded-2xl animate-slide-in">
      <div className="card-body gap-5 p-5 sm:p-6">
        <h1 className="text-2xl font-semibold leading-tight">Edit Profile</h1>

        {props.error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{props.error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-control">
            <label className="label" htmlFor="settings-name"><span className="label-text text-sm font-medium">Name</span></label>
            <input id="settings-name" className="input input-bordered min-h-12 w-full glow-input bg-base-100/30 rounded-xl text-base" type="text" name="name" placeholder="Name" value={state.name} onChange={handleInputChange} required autoComplete="name" />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="settings-username"><span className="label-text text-sm font-medium">Username</span></label>
            <input id="settings-username" className="input input-bordered min-h-12 w-full glow-input bg-base-100/30 rounded-xl text-base" type="text" name="username" placeholder="Username" value={state.username} onChange={handleInputChange} required autoComplete="username" />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="settings-email"><span className="label-text text-sm font-medium">Email</span></label>
            <input id="settings-email" className="input input-bordered min-h-12 w-full glow-input bg-base-100/30 rounded-xl text-base" type="email" name="email" placeholder="Email" value={state.email} onChange={handleInputChange} required autoComplete="email" />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="settings-bio"><span className="label-text text-sm font-medium">Bio</span></label>
            <textarea id="settings-bio" className="textarea textarea-bordered min-h-28 w-full glow-input bg-base-100/30 rounded-xl text-base leading-6" name="bio" placeholder="Tell us about yourself" value={state.bio} onChange={handleInputChange} rows={4} />
          </div>
          <button type="submit" className="btn btn-primary min-h-12 rounded-xl px-5 text-base" disabled={isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner" aria-label="Saving"></span> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
