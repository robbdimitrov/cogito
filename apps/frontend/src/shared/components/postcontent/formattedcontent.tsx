import type { ReactNode } from 'react';
import Link from 'next/link';

interface FormattedContentProps {
  content: string;
  className?: string;
}

function FormattedContent({ content, className = '' }: FormattedContentProps) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  // Use a local regex and matchAll to avoid global RegExp object state mutations during React concurrent renders
  const tokenRegex = /(https?:\/\/[^\s]+)|(^|[^A-Za-z0-9_])([#@])([A-Za-z0-9_]{1,50})/g;
  const matches = Array.from(content.matchAll(tokenRegex));

  for (const match of matches) {
    if (match[1]) {
      let url = match[1];
      const matchStart = match.index!;
      
      // Remove trailing punctuation from URL (common when URL is at the end of a sentence)
      const punctuationMatch = url.match(/[.,;:?!"']+$/);
      if (punctuationMatch) {
        url = url.slice(0, -punctuationMatch[0].length);
      }

      if (matchStart > lastIndex) {
        parts.push(content.slice(lastIndex, matchStart));
      }
      parts.push(
        <a key={`${matchStart}-url`} href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline break-all">
          {url}
        </a>
      );
      // Advance lastIndex by the actual URL length (excluding the trailing punctuation, which will be caught by the next slice)
      lastIndex = matchStart + url.length;
    } else {
      const [fullMatch, _, prefix, symbol, tagOrUser] = match;
      const matchStart = match.index! + (prefix || '').length;

      if (matchStart > lastIndex) {
        parts.push(content.slice(lastIndex, matchStart));
      }

      if (symbol === '#') {
        const normalizedTag = tagOrUser.toLowerCase();
        parts.push(
          <Link
            key={`${matchStart}-hash-${tagOrUser}`}
            href={`/hashtags/${encodeURIComponent(normalizedTag)}`}
            className="font-medium text-primary hover:underline"
          >
            #{tagOrUser}
          </Link>
        );
      } else if (symbol === '@') {
        parts.push(
          <Link
            key={`${matchStart}-mention-${tagOrUser}`}
            href={`/@${encodeURIComponent(tagOrUser)}`}
            className="font-medium text-primary hover:underline"
          >
            @{tagOrUser}
          </Link>
        );
      }

      lastIndex = match.index! + fullMatch.length;
    }
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <p className={className}>{parts.length > 0 ? parts : content}</p>;
}

export default FormattedContent;
