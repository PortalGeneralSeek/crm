import { iconMap } from './icons';

// The original pages load `lucide@latest`, which no longer ships the brand icons, so their
// <i> placeholders stay empty there. VITE_HIDE_BRAND_ICONS=1 reproduces that exactly.
const HIDE_BRAND_ICONS = import.meta.env.VITE_HIDE_BRAND_ICONS === '1';
const BRAND_ICONS = new Set(['figma', 'github']);

export default function Icon({ name, ...props }) {
  if (HIDE_BRAND_ICONS && BRAND_ICONS.has(name)) {
    return <i data-lucide={name} className={props.className} />;
  }
  const Component = iconMap[name];
  if (!Component) {
    if (import.meta.env.DEV) console.warn(`[Icon] unknown icon "${name}"`);
    return null;
  }
  return <Component {...props} />;
}
