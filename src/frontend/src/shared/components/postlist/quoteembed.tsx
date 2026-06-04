import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import FormattedContent from '@/shared/components/postcontent/formattedcontent';
import { Post } from '@/shared/types';

function QuoteEmbed({ post }: { post: Post }) {
  const author = post.user;

  return (
    <div className="border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl p-3 mt-2">
      <div className="flex items-center gap-2 mb-1.5">
        {author && (
          <Link href={`/@${author.username}`} className="shrink-0 transition-transform duration-200 hover:scale-105">
            <Avatar name={author.name} size="sm" photoKey={author.profilePhotoKey} />
          </Link>
        )}
        {author && (
          <div className="flex items-center gap-1.5 min-w-0">
            <Link href={`/@${author.username}`} className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:underline truncate">
              {author.name}
            </Link>
            <Link href={`/@${author.username}`} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors truncate">
              @{author.username}
            </Link>
          </div>
        )}
      </div>
      <FormattedContent
        content={post.content}
        className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4 break-words"
      />
      {post.mediaKey && (
        <div className="mt-2">
          <img
            src={`/api/uploads/${post.mediaKey}`}
            alt="Quoted post attachment"
            className="max-h-40 w-auto rounded-lg object-contain border border-slate-200 dark:border-slate-700"
          />
        </div>
      )}
    </div>
  );
}

export default QuoteEmbed;
