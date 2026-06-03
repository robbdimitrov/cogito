import React, { useState, useEffect, useRef } from 'react';
import Avatar from '@/shared/components/avatar/avatar';
import { Pen, Send, Image as ImageIcon, X } from 'lucide-react';
import GlassCard from '@/shared/components/ui/surface';
import { useAPI } from '@/shared/contexts/apicontext';
import { User } from '@/shared/types';
import { resizeImageForUpload } from '@/shared/utils/image';
import { useToast } from '@/shared/components/toast/toast';

function CreateThought({user, onCreatePost}: {user: User, onCreatePost: (content: string, mediaKey?: string) => Promise<void>}) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeahead, setShowTypeahead] = useState(false);
  const [mediaKey, setMediaKey] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const api = useAPI();
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 0) {
        api.searchUsers(searchQuery, 5).then((res) => {
          setSuggestions(res.items || []);
          setShowTypeahead(true);
        }).catch(() => {
          setSuggestions([]);
        });
      } else {
        setSuggestions([]);
        setShowTypeahead(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, api]);

  const handleChange = (e) => {
    const value = e.target.value;
    setContent(value);
    
    const pos = e.target.selectionStart;
    setCursorPosition(pos);
    
    const textBeforeCursor = value.substring(0, pos);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    if (match) {
      setSearchQuery(match[1]);
      setShowTypeahead(true);
    } else {
      setSearchQuery('');
      setShowTypeahead(false);
    }
  };

  const handleSelectSuggestion = (username) => {
    if (cursorPosition === null) return;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    
    if (match) {
      const matchStart = textBeforeCursor.lastIndexOf('@' + match[1]);
      const newContent = content.substring(0, matchStart) + '@' + username + ' ' + textAfterCursor;
      setContent(newContent);
    }
    
    setShowTypeahead(false);
    setSearchQuery('');
    textareaRef.current?.focus();
  };

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if ((!content.trim() && !mediaKey) || isSubmitting) return;
    setIsSubmitting(true);
    onCreatePost(content.trim(), mediaKey || undefined)
      .then(() => {
        setContent('');
        setMediaKey(null);
        setIsSubmitting(false);
        setShowTypeahead(false);
      })
      .catch(() => setIsSubmitting(false));
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const resized = await resizeImageForUpload(file);
      const res = await api.uploadImage(resized);
      setMediaKey(res.key);
      toast.success('Image attached');
    } catch (e: any) {
      toast.error(e.message || 'Failed to attach image');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  }

  return (
    <GlassCard>
      <div className="card-body p-4 sm:p-5">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 sm:gap-4">
            <div className="hidden sm:block shrink-0">
              <Avatar name={user?.name} size="md" photoKey={user?.profilePhotoKey} />
            </div>
            <div className="relative flex-1 min-w-0">
              <Pen className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 dark:text-slate-400 pointer-events-none" />
              <textarea
                ref={textareaRef}
                className="textarea w-full resize-none rounded-2xl border-slate-200/70 bg-white/55 pl-10 text-base leading-relaxed shadow-inner shadow-slate-900/5 transition-all duration-300 focus:border-primary/60 focus:bg-white/80 focus:ring-4 focus:ring-primary/10 dark:border-slate-700/70 dark:bg-slate-950/35 dark:focus:bg-slate-950/60 sm:text-lg"
                placeholder="What's on your mind?"
                value={content}
                onChange={handleChange}
                onClick={handleChange}
                onKeyUp={handleChange}
                rows={3}
                maxLength={255}
              />
              {showTypeahead && suggestions.length > 0 && (
                <div className="absolute z-10 w-64 top-[105%] left-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
                  {suggestions.map((u, i) => (
                    <button
                      key={u.id || i}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0 transition-colors"
                      onClick={() => handleSelectSuggestion(u.username)}
                    >
                      <Avatar name={u.name} size="sm" photoKey={u.profilePhotoKey} />
                      <div className="overflow-hidden">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{u.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">@{u.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {mediaKey && (
            <div className="mt-3 sm:pl-14">
              <div className="relative inline-block">
                <img src={`/api/uploads/${mediaKey}`} alt="Attached" className="max-h-60 rounded-xl object-cover border border-slate-200 dark:border-slate-800" />
                <button type="button" onClick={() => setMediaKey(null)} className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center mt-3 sm:pl-14">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle text-slate-500 hover:text-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                title="Attach image"
              >
                {uploadingImage ? <span className="loading loading-spinner loading-xs"></span> : <ImageIcon className="h-5 w-5" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageUpload} />
              
              <span className={`text-sm ${content.length > 240 ? 'text-warning' : 'text-slate-500 dark:text-slate-400'}`}>{content.length}/255</span>
            </div>
            <button
              type="submit"
              className={`btn btn-primary btn-sm gap-1 rounded-full px-5 ${!isSubmitting && (content.trim() || mediaKey) ? 'shadow-lg shadow-primary/20' : 'shadow-none'}`}
              disabled={isSubmitting || (!content.trim() && !mediaKey)}
            >
              <Send className="h-4 w-4" />
              Post
            </button>
          </div>
        </form>
      </div>
    </GlassCard>
  );
}

export default CreateThought;
