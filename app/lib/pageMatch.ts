// app/lib/pageMatch.ts
import { PAGES, SitePage } from "@/app/data/pages";

function norm(s: string) {
  return (s || "").toLowerCase();
}

export function findBestPage(userText: string): SitePage | null {
  const text = norm(userText);

  // 1) direct title match
  for (const p of PAGES) {
    if (text.includes(norm(p.title))) return p;
  }

  // 2) keyword tally
  let best: { page: SitePage; score: number } | null = null;
  for (const p of PAGES) {
    let score = 0;
    for (const k of p.keywords) {
      if (text.includes(norm(k))) score += 1;
    }
    // slight bonus if any word from the title appears
    for (const word of p.title.split(/\s+/)) {
      if (word.length > 3 && text.includes(norm(word))) score += 0.5;
    }
    if (!best || score > best.score) best = { page: p, score };
  }

  // threshold so we don’t return junk
  return best && best.score >= 1 ? best.page : null;
}
