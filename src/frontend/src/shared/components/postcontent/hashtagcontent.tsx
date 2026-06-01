import React from 'react';
import Link from 'next/link';

const hashtagRegex = /(^|[^A-Za-z0-9_])#([A-Za-z0-9_]{1,50})/g;

interface HashtagContentProps {
  content: string;
  className?: string;
}

function HashtagContent({ content, className = '' }: HashtagContentProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  hashtagRegex.lastIndex = 0;
  while ((match = hashtagRegex.exec(content)) !== null) {
    const [fullMatch, prefix, tag] = match;
    const hashtagStart = match.index + prefix.length;

    if (hashtagStart > lastIndex) {
      parts.push(content.slice(lastIndex, hashtagStart));
    }

    const normalizedTag = tag.toLowerCase();
    parts.push(
      <Link
        key={`${hashtagStart}-${tag}`}
        href={`/hashtags/${encodeURIComponent(normalizedTag)}`}
        className="font-medium text-primary hover:underline"
      >
        #{tag}
      </Link>
    );

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <p className={className}>{parts.length > 0 ? parts : content}</p>;
}

export default HashtagContent;
