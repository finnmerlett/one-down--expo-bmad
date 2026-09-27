import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { Gabarito_400Regular, Gabarito_500Medium } from '@expo-google-fonts/gabarito';
import {
  Karla_400Regular,
  Karla_500Medium,
  Karla_600SemiBold,
  Karla_700Bold,
} from '@expo-google-fonts/karla';

/**
 * v1.5 type stack (designs/v1.5-implementation-spec.md §1): Gabarito for
 * titles, Karla for UI text, DM Mono for numbers & caps labels. Static
 * weights = separate RN font families, all loaded up front — by the app root
 * layout and by the web story renderer behind the design canvas.
 */
export const APP_FONTS = {
  Gabarito_400Regular,
  Gabarito_500Medium,
  Karla_400Regular,
  Karla_500Medium,
  Karla_600SemiBold,
  Karla_700Bold,
  DMMono_400Regular,
  DMMono_500Medium,
};
