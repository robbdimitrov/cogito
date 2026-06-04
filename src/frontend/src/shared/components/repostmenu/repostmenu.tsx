'use client';

import { useRef } from 'react';
import { Repeat } from 'lucide-react';

interface RepostMenuProps {
  reposted: boolean;
  reposts: number;
  isReposting: boolean;
  onRepost: () => void;
  onQuote: () => void;
}

function RepostMenu({ reposted, reposts, isReposting, onRepost, onQuote }: RepostMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function handleRepost() {
    if (detailsRef.current) detailsRef.current.open = false;
    onRepost();
  }

  function handleQuote() {
    if (detailsRef.current) detailsRef.current.open = false;
    onQuote();
  }

  return (
    <details ref={detailsRef} className="dropdown">
      <summary
        className={`btn btn-ghost btn-sm gap-2 rounded-full px-4 hover:scale-105 active:scale-95 transition-all duration-150 list-none ${reposted ? 'text-success bg-success/10' : 'text-slate-500 dark:text-slate-400 hover:text-success hover:bg-success/5'}`}
        aria-label={reposted ? 'Remove rethought' : 'Rethought options'}
        aria-disabled={isReposting}
        onClick={(e) => { if (isReposting) e.preventDefault(); }}
      >
        <Repeat className={`h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${reposted ? 'rotate-180 scale-110' : 'rotate-0 scale-100'}`} />
        <span className="text-xs sm:text-sm font-semibold tracking-wide">{reposts}</span>
      </summary>
      <ul className="dropdown-content menu bg-base-100 rounded-box border border-slate-200 dark:border-slate-700 shadow-lg z-10 w-40 p-1">
        <li>
          <button type="button" onClick={handleRepost} disabled={isReposting}>
            <Repeat className="h-4 w-4" />
            {reposted ? 'Undo Rethought' : 'Rethought'}
          </button>
        </li>
        <li>
          <button type="button" onClick={handleQuote} disabled={isReposting}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
            </svg>
            Quote
          </button>
        </li>
      </ul>
    </details>
  );
}

export default RepostMenu;
