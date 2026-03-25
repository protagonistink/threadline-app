import { Fragment, type ReactNode } from 'react';

function openExternalSafely(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    void window.api.shell.openExternal(parsed.toString());
  } catch {
    // Ignore malformed links from assistant output.
  }
}

function renderInline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`${index}-bold`} className="font-semibold text-text-primary">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`${index}-code`}
          className="rounded bg-bg-card px-1.5 py-0.5 font-mono text-[0.92em] text-text-primary"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${index}-link`}
            href={linkMatch[2]}
            rel="noreferrer noopener"
            className="text-accent-warm underline underline-offset-2"
            onClick={(event) => {
              event.preventDefault();
              openExternalSafely(linkMatch[2]);
            }}
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={`${index}-italic`} className="italic text-text-primary">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}

function renderParagraph(text: string, key: string) {
  if (!text.trim()) return null;
  return (
    <p key={key} className="mb-4 last:mb-0">
      {renderInline(text)}
    </p>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      nodes.push(
        <Tag
          key={`heading-${i}`}
          className={
            level === 1
              ? 'mb-3 font-display text-[24px] font-bold tracking-[-0.02em] text-text-emphasis'
              : level === 2
                ? 'mb-3 font-display text-[20px] font-bold tracking-[-0.02em] text-text-emphasis'
                : 'mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-secondary'
          }
        >
          {renderInline(headingMatch[2])}
        </Tag>
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      nodes.push(
        <pre
          key={`code-${i}`}
          className="mb-4 overflow-x-auto rounded-xl border border-border bg-bg-card px-4 py-3 text-[13px] leading-relaxed text-text-primary"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i += 1;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="mb-4 list-disc space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="mb-4 list-decimal space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || /^(#{1,3})\s+/.test(next) || /^[-*•]\s+/.test(next) || /^\d+\.\s+/.test(next) || next.startsWith('```')) {
        break;
      }
      paragraphLines.push(next);
      i += 1;
    }
    nodes.push(renderParagraph(paragraphLines.join(' '), `p-${i}`));
  }

  return <Fragment>{nodes}</Fragment>;
}
