import { Children, createElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Furigana } from "@/components/shared/Furigana";

/**
 * ReactMarkdown wrapper for LLM-generated lesson prose. Plain markdown text
 * nodes bypass Furigana, so Japanese inside tables/lists renders at Latin
 * size with no JP font stack — every text-bearing tag routes its string
 * children through Furigana to get per-run lang="ja" (and the size bump).
 */
function jpChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) =>
    typeof child === "string" ? <Furigana text={child} /> : child
  );
}

const TEXT_TAGS = [
  "p",
  "li",
  "td",
  "th",
  "em",
  "strong",
  "code",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
] as const;

const components: Components = Object.fromEntries(
  TEXT_TAGS.map((tag) => [
    tag,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ node: _node, children, ...props }: any) =>
      createElement(tag, props, jpChildren(children)),
  ])
);

export function JpMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
