import * as React from 'react';
import { IconName } from '../models/types';

export interface TileIconProps {
  name: IconName;
  size?: number;
  className?: string;
}

const paths: Record<IconName, React.ReactNode> = {
  tools: <><path d="m14.5 6.5 3 3M5 19l5.5-5.5M15.8 3.4a5.1 5.1 0 0 0-6.3 6.3L3.8 15.4a3.4 3.4 0 0 0 4.8 4.8l5.7-5.7a5.1 5.1 0 0 0 6.3-6.3l-3.8 3.1-4.1-4.1Z" /></>,
  apps: <><rect x="3" y="3" width="7" height="7" rx="1.7" /><rect x="14" y="3" width="7" height="7" rx="1.7" /><rect x="3" y="14" width="7" height="7" rx="1.7" /><path d="M14 17.5h7m-3.5-3.5v7" /></>,
  project: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16m5-7h4m-4 3h2" /></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  book: <><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Zm-4 9 3 3 5-6" /></>,
  ticket: <><path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4Zm11 0v3m0 3v2m0 3v3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  printer: <><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7Z" /><path d="M17 11h.01" /></>,
  cloud: <><path d="M7 19a5 5 0 0 1-1.1-9.9 6.5 6.5 0 0 1 12.5-.6A5.3 5.3 0 0 1 18 19Z" /></>,
  laptop: <><rect x="5" y="3" width="14" height="13" rx="1.5" /><path d="m5 16-3 5h20l-3-5M10 19h4" /></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  sparkles: <><path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6ZM4 3v4M2 5h4m14 12v4m-2-2h4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-14 4h3m4 0h3m-10 3h3" /></>,
  link: <><path d="m10 14 4-4m-6 6-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0m2 10a4.2 4.2 0 0 0 6 0l4-4a4.2 4.2 0 0 0-6-6l-1 1" transform="translate(1 0) scale(.92 1)" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" /></>,
  chart: <><path d="M4 3v17h17M8 16v-5m5 5V7m5 9v-8" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></>
};

/** Decorative, local SVG icons. Accessible names belong to the surrounding control. */
export function TileIcon({ name, size = 24, className }: TileIconProps): React.ReactElement {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name] || paths.link}</svg>;
}
