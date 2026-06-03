import React from 'react';
import Link from 'next/link';

const tokenRegex = /(https?:\/\/[^\s]+)|(^|[^A-Za-z0-9_])([#@])([A-Za-z0-9_]{1,50})/g;

interface FormattedContentProps {
  content: string;
  className?: string;
}

function FormattedContent({ content, className = '' }: FormattedContentProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  tokenRegex.lastIndex = 0;
  while ((match = tokenRegex.exec(content)) !== null) {
    if (match[1]) {
      const url = match[1];
      const matchStart = match.index;
      if (matchStart > lastIndex) {
        parts.push(content.slice(lastIndex, matchStart));
      }
      parts.push(
        <a key={`${matchStart}-url`} href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline break-all">
          {url}
        </a>
      );
      lastIndex = matchStart + url.length;
    } else {
      const [fullMatch, _, prefix, symbol, tagOrUser] = match;
      const matchStart = match.index + (prefix || '').length;

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

      lastIndex = match.index + fullMatch.length;
    }
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <p className={className}>{parts.length > 0 ? parts : content}</p>;
}

export default FormattedContent;
