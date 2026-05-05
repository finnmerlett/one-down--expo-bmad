import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react-native';

export type IconProps = LucideProps & {
  as: ComponentType<LucideProps>;
};

export function Icon({ as: Component, size = 24, ...props }: IconProps) {
  return <Component size={size} {...props} />;
}
