import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

export type PlanoIconLibrary = 'Ionicons' | 'MaterialCommunityIcons';

export interface PlanoIconDefinition {
  name: string;
  library: PlanoIconLibrary;
}

const MATERIAL_COMMUNITY_ICON_NAMES = new Set([
  'book-open-variant',
  'lightbulb-on',
  'hands-pray',
]);

export function resolvePlanoIconDefinition(name: string): PlanoIconDefinition {
  if (MATERIAL_COMMUNITY_ICON_NAMES.has(name)) {
    return { name, library: 'MaterialCommunityIcons' };
  }

  return { name, library: 'Ionicons' };
}

type PlanoIconProps = {
  name: string;
  size: number;
  color: string;
  style?: any;
};

export function PlanoIcon({ name, size, color, style }: PlanoIconProps) {
  const icon = resolvePlanoIconDefinition(name);

  if (icon.library === 'MaterialCommunityIcons') {
    return React.createElement(MaterialCommunityIcons, {
      name: icon.name as any,
      size,
      color,
      style,
    });
  }

  return React.createElement(Ionicons, {
    name: icon.name as any,
    size,
    color,
    style,
  });
}