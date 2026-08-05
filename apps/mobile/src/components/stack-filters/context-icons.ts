import { Globe, House, Laptop, MapPin, Smartphone, type LucideIcon } from 'lucide-react-native';
import type { TaskContext } from '@one-down/shared';

/** Shared context glyphs (context bar, card bottom rail, card back chips). */
export const CONTEXT_ICONS: Record<TaskContext, LucideIcon> = {
  home: House,
  out_and_about: MapPin,
  phone: Smartphone,
  laptop: Laptop,
  internet: Globe,
};
