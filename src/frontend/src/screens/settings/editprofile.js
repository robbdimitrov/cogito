import React, {useState, useEffect} from 'react';

function EditProfile(props) {
  const [state, setState] = useState({
    name: props.user.name,
    username: props.user.username,
    email: props.user.email,
    bio: props.user.bio,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (props.error) {
      setIsSubmitting(false);
    }
  }, [props.error]);

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const {name, username, email, bio} = state;
    props.updateUser(name, username, email, bio);
  }

  function handleInputChange(event) {
    const {name, value} = event.target;
    setState((s) => ({...s, [name]: value}));
  }

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body">
        <h2 className="card-title text-xl mb-4">Edit Profile</h2>

        {props.error && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{props.error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Name</span></label>
            <input className="input input-bordered" type="text" name="name" placeholder="Name" value={state.name} onChange={handleInputChange} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Username</span></label>
            <input className="input input-bordered" type="text" name="username" placeholder="Username" value={state.username} onChange={handleInputChange} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Email</span></label>
            <input className="input input-bordered" type="email" name="email" placeholder="Email" value={state.email} onChange={handleInputChange} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Bio</span></label>
            <textarea className="textarea textarea-bordered" name="bio" placeholder="Tell us about yourself" value={state.bio} onChange={handleInputChange} rows={3} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner"></span> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
