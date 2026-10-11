import type { ReactNode } from 'react';

// Íconos de trazo sobre una grilla de 24px. Se agregan acá para no depender de una librería.
const paths: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18 14.3a6.5 6.5 0 0 1 3.5 5.7" /></>,
  groups: <><circle cx="12" cy="7" r="3" /><circle cx="5" cy="10" r="2.2" /><circle cx="19" cy="10" r="2.2" /><path d="M7 20a5 5 0 0 1 10 0" /><path d="M1.5 19a3.5 3.5 0 0 1 4.6-3.3" /><path d="M22.5 19a3.5 3.5 0 0 0-4.6-3.3" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a3 3 0 0 1 6 0v1.5H9z" /><path d="M9 11h6M9 15h4" /></>,
  exam: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="m9 14.5 2 2 4-4.5" /></>,
  attendance: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m9 15.5 2 2 4-4" /></>,
  award: <><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  megaphone: <><path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1Z" /><path d="M15 8.5a4.5 4.5 0 0 1 0 7" /><path d="M18 5.5a8.5 8.5 0 0 1 0 13" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z" /><path d="M4 20a2 2 0 0 0 2 2h13" /><path d="M9 7.5h6" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.500 7.500-5 7.500-9.500V6z" /><path d="m9 12 2.200 2.200L15 10" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.400 15a1.700 1.700 0 0 0 .300 1.900l.100.100a2 2 0 1 1-2.800 2.800l-.100-.100a1.700 1.700 0 0 0-1.900-.300 1.700 1.700 0 0 0-1 1.500V21a2 2 0 1 1-4 0v-.100a1.700 1.700 0 0 0-1.100-1.500 1.700 1.700 0 0 0-1.900.300l-.100.100a2 2 0 1 1-2.800-2.800l.100-.100a1.700 1.700 0 0 0 .300-1.900 1.700 1.700 0 0 0-1.500-1H3a2 2 0 1 1 0-4h.100a1.700 1.700 0 0 0 1.500-1.100 1.700 1.700 0 0 0-.300-1.900l-.100-.100a2 2 0 1 1 2.800-2.800l.100.100a1.700 1.700 0 0 0 1.900.300H9a1.700 1.700 0 0 0 1-1.500V3a2 2 0 1 1 4 0v.100a1.700 1.700 0 0 0 1 1.500 1.700 1.700 0 0 0 1.900-.300l.100-.100a2 2 0 1 1 2.800 2.800l-.100.100a1.700 1.700 0 0 0-.300 1.900V9a1.700 1.700 0 0 0 1.500 1H21a2 2 0 1 1 0 4h-.100a1.700 1.700 0 0 0-1.500 1Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20.500 20.500-4.300-4.300" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.500 4.500 4.500L19 7.500" />,
  'check-circle': <><circle cx="12" cy="12" r="9" /><path d="m8 12.500 2.700 2.700L16 9.500" /></>,
  alert: <><path d="M10.300 4.300 2.600 17.500A2 2 0 0 0 4.300 20.500h15.400a2 2 0 0 0 1.700-3L13.700 4.300a2 2 0 0 0-3.400 0Z" /><path d="M12 9.500v4M12 17h.010" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.010" /></>,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400" /></>,
  moon: <path d="M20.500 14.500A8.500 8.500 0 0 1 9.500 3.500a8.500 8.500 0 1 0 11 11Z" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.500 6.500 4 4" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.500-4.500L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.500 4.500L20 16" /><path d="M20 20v-4h-4" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>,
  more: <><circle cx="5" cy="12" r="1.300" /><circle cx="12" cy="12" r="1.300" /><circle cx="19" cy="12" r="1.300" /></>,
  star: <path d="m12 3 2.700 5.600 6.100.900-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.900z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.500 7 8.500 6 8.500-6" /></>,
  phone: <path d="M6.500 3h3l1.500 4.500-2 1.500a12 12 0 0 0 6 6l1.500-2L21 14.500v3A2.500 2.500 0 0 1 18.500 20 15.500 15.500 0 0 1 4 5.500 2.500 2.500 0 0 1 6.500 3Z" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7.500a4 4 0 0 1 8 0V11" /></>,
  eye: <><path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M3 3l18 18" /><path d="M10.600 5.100A10.500 10.500 0 0 1 12 5c6.400 0 10 7 10 7a17 17 0 0 1-3.200 4.100M6.300 6.300A17 17 0 0 0 2 12s3.600 7 10 7a10 10 0 0 0 4.300-1" /><path d="M9.900 9.900a3 3 0 0 0 4.200 4.200" /></>,
  link: <><path d="M10 14a4.500 4.500 0 0 0 6.400 0l3-3a4.500 4.500 0 0 0-6.400-6.400l-1.200 1.200" /><path d="M14 10a4.500 4.500 0 0 0-6.400 0l-3 3a4.500 4.500 0 0 0 6.400 6.400l1.200-1.200" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.800" /><path d="m4 18 5.500-5 4 3.500 2.500-2 4 3.500" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.400 0 2-.900 2-2 0-1.500-1-1.800-1-3 0-1 .800-2 2-2h2a4 4 0 0 0 4-4c0-4-4-7-9-7Z" /><circle cx="7.500" cy="11.500" r="1" /><circle cx="10.500" cy="7.500" r="1" /><circle cx="15.500" cy="7.500" r="1" /></>,
  printer: <><path d="M7 8V3h10v5" /><rect x="3" y="8" width="18" height="9" rx="2" /><rect x="7" y="14" width="10" height="7" rx="1" /></>,
  sparkles: <><path d="M12 3l1.700 4.800L18.500 9.500l-4.800 1.700L12 16l-1.700-4.800L5.500 9.500l4.800-1.700z" /><path d="M19 15l.700 2 2 .700-2 .700-.700 2-.700-2-2-.700 2-.700z" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.700.400-1 1-1 1.700M12 17h.010" /></>,
  send: <><path d="M21 3 10 14" /><path d="M21 3l-7 18-4-7-7-4z" /></>,
  filter: <path d="M3 5h18l-7 8.500V19l-4 2v-7.500z" />,
  sort: <path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4" />,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3M14 9l2 2" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  drag: <><circle cx="9" cy="6" r="1.200" /><circle cx="15" cy="6" r="1.200" /><circle cx="9" cy="12" r="1.200" /><circle cx="15" cy="12" r="1.200" /><circle cx="9" cy="18" r="1.200" /><circle cx="15" cy="18" r="1.200" /></>,
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name] ?? paths.info}
    </svg>
  );
}
