import React, {useState, useEffect, useRef} from 'react';
import { AlertCircle, Camera, Trash2, Image as ImageIcon } from 'lucide-react';
import GlassCard, {Field, FormInput, FormTextArea} from '@/shared/components/ui/surface';
import { resizeImageForUpload } from '@/shared/utils/image';
import { useAPI } from '@/shared/contexts/apicontext';
import { useToast } from '@/shared/components/toast/toast';

function EditProfile(props: any) {
  const apiClient = useAPI();
  const toast = useToast();

  const [state, setState] = useState({
    name: props.user.name || '',
    username: props.user.username || '',
    email: props.user.email || '',
    bio: props.user.bio || '',
    profilePhotoKey: props.user.profilePhotoKey || '',
    coverPhotoKey: props.user.coverPhotoKey || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setState({
      name: props.user.name || '',
      username: props.user.username || '',
      email: props.user.email || '',
      bio: props.user.bio || '',
      profilePhotoKey: props.user.profilePhotoKey || '',
      coverPhotoKey: props.user.coverPhotoKey || '',
    });
  }, [props.user]);

  useEffect(() => {
    if (props.error) {
      setIsSubmitting(false);
    }
  }, [props.error]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    const {name, username, email, bio, profilePhotoKey, coverPhotoKey} = state;
    props.updateUser(name, username, email, bio, profilePhotoKey, coverPhotoKey).finally(() => setIsSubmitting(false));
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const {name, value} = event.target;
    setState((s) => ({...s, [name]: value}));
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const resized = await resizeImageForUpload(file);
      const res = await apiClient.uploadImage(resized);
      setState(s => ({ ...s, [type === 'avatar' ? 'profilePhotoKey' : 'coverPhotoKey']: res.key }));
      toast.success(`${type === 'avatar' ? 'Profile' : 'Cover'} photo uploaded`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to upload image');
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
      event.target.value = ''; // Reset input
    }
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
          
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <Field id="settings-avatar" label="Profile Photo">
              <div className="flex items-center gap-3">
                {state.profilePhotoKey ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-base-content/10">
                    <img src={`/api/uploads/${state.profilePhotoKey}`} alt="Avatar" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-base-200 border border-base-content/10">
                    <Camera className="h-6 w-6 text-base-content/50" />
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
                    {uploadingAvatar ? <span className="loading loading-spinner"></span> : 'Change'}
                  </button>
                  {state.profilePhotoKey && (
                    <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => setState(s => ({...s, profilePhotoKey: ''}))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={e => handleImageUpload(e, 'avatar')} />
              </div>
            </Field>

            <Field id="settings-cover" label="Cover Photo">
              <div className="flex items-center gap-3">
                {state.coverPhotoKey ? (
                  <div className="relative h-16 w-32 overflow-hidden rounded-lg border border-base-content/10">
                    <img src={`/api/uploads/${state.coverPhotoKey}`} alt="Cover" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-16 w-32 items-center justify-center rounded-lg bg-base-200 border border-base-content/10">
                    <ImageIcon className="h-6 w-6 text-base-content/50" />
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
                    {uploadingCover ? <span className="loading loading-spinner"></span> : 'Change'}
                  </button>
                  {state.coverPhotoKey && (
                    <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => setState(s => ({...s, coverPhotoKey: ''}))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={e => handleImageUpload(e, 'cover')} />
              </div>
            </Field>
          </div>

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
