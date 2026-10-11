import {useSyncExternalStore} from 'react';

const query = '(prefers-reduced-motion: reduce)';
const subscribe = (notify: () => void) => {
  const media = matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => true);
}
