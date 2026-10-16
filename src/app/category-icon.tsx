import type { WorkCategorySlug } from "./work-categories";

const categoryPaths: Record<WorkCategorySlug, React.ReactNode> = {
  video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3M8 9l4 3-4 3" /></>,
  "e-book": <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 7h8M8 11h7" /></>,
  science: <><path d="M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3M8 15h8" /><circle cx="12" cy="18" r="1" /></>,
  populer: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  insight: <><path d="M9 18h6M10 22h4M8.2 14.5A7 7 0 1 1 15.8 14.5c-.9.7-1.3 1.3-1.5 2.5h-4.6c-.2-1.2-.6-1.8-1.5-2.5Z" /><path d="M12 7v4M10 9h4" /></>,
  review: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 8h6M8 12h6M8 16h7" /><path d="m17 6 .7 1.4 1.5.2-1.1 1.1.3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1.1 1.5-.2L17 6Z" /></>,
  "best-practice": <><path d="M4 4h16v16H4z" /><path d="m8 12 2.5 2.5L16 9" /></>,
};

export function CategoryIcon({ categorySlug, size = 14 }: { categorySlug: WorkCategorySlug; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{categoryPaths[categorySlug]}</svg>;
}
