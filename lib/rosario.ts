import type { ImageSourcePropType } from 'react-native';

// Mapeamento de imagens dos mistérios do Rosário
export const ROSARIO_IMAGE_SOURCES: Record<number, ImageSourcePropType> = {
  1: require('../data/Rosário/Gozosos/1_misterio.jpg'),
  2: require('../data/Rosário/Gozosos/2_misterio.jpg'),
  3: require('../data/Rosário/Gozosos/3_misterio.jpg'),
  4: require('../data/Rosário/Gozosos/4_misterio.jpg'),
  5: require('../data/Rosário/Gozosos/5_misterio.jpg'),

  6: require('../data/Rosário/Luminosos/1_misterio.jpg'),
  7: require('../data/Rosário/Luminosos/2_misterio.jpg'),
  8: require('../data/Rosário/Luminosos/3_misterio.jpg'),
  9: require('../data/Rosário/Luminosos/4_misterio.jpg'),
 10: require('../data/Rosário/Luminosos/5_misterio.jpg'),

 11: require('../data/Rosário/Dolorosos/1_misterio.jpg'),
 12: require('../data/Rosário/Dolorosos/2_misterio.jpg'),
 13: require('../data/Rosário/Dolorosos/3_misterio.jpg'),
 14: require('../data/Rosário/Dolorosos/4_misterio.jpg'),
 15: require('../data/Rosário/Dolorosos/5_misterio.jpg'),

 16: require('../data/Rosário/Gloriosos/1_misterio.jpg'),
 17: require('../data/Rosário/Gloriosos/2_misterio.jpg'),
 18: require('../data/Rosário/Gloriosos/3_misterio.jpg'),
 19: require('../data/Rosário/Gloriosos/4_misterio.jpg'),
 20: require('../data/Rosário/Gloriosos/5_misterio.jpg'),
};

export const getRosarioImageSource = (index: number): ImageSourcePropType | undefined => {
  return ROSARIO_IMAGE_SOURCES[index];
};

export const getTodayMisteriosStartId = (date?: Date): number => {
  const targetDate = date || new Date();
  const day = targetDate.getDay(); // 0: Domingo, 1: Segunda, etc.
  switch (day) {
    case 1: // Segunda-feira
    case 6: // Sábado
      return 1; // Gozosos
    case 2: // Terça-feira
    case 5: // Sexta-feira
      return 11; // Dolorosos
    case 3: // Quarta-feira
    case 0: // Domingo
      return 16; // Gloriosos
    case 4: // Quinta-feira
      return 6; // Luminosos
    default:
      return 1; // Gozosos fallback
  }
};
