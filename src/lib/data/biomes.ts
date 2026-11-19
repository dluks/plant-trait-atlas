/** The 14 biomes shared by Olson et al. (2001) and RESOLVE Ecoregions 2017. */
export const BIOMES = [
  'Tropical and subtropical moist broadleaf forests',
  'Tropical and subtropical dry broadleaf forests',
  'Tropical and subtropical coniferous forests',
  'Temperate broadleaf and mixed forests',
  'Temperate conifer forests',
  'Boreal forests and taiga',
  'Tropical and subtropical grasslands, savannas and shrublands',
  'Temperate grasslands, savannas and shrublands',
  'Flooded grasslands and savannas',
  'Montane grasslands and shrublands',
  'Tundra',
  'Mediterranean forests, woodlands and scrub',
  'Deserts and xeric shrublands',
  'Mangroves'
];

/**
 * One color per biome, in BIOMES order (biome id = index + 1). Hues follow the
 * usual ecological reading (greens forest, yellows grassland, sand desert);
 * neighbors in hue differ in lightness so the map reads without color alone.
 */
export const BIOME_COLORS = [
  '#1b7837', // tropical moist broadleaf
  '#8fbf3f', // tropical dry broadleaf
  '#35978f', // tropical coniferous
  '#b8e0a8', // temperate broadleaf and mixed
  '#01574f', // temperate conifer
  '#8c96c6', // boreal
  '#e6ab02', // tropical grasslands and savannas
  '#f2e394', // temperate grasslands
  '#4d9ad1', // flooded grasslands
  '#a6712a', // montane grasslands
  '#c9c1b4', // tundra (warm gray, so it stays apart from the pale blue water)
  '#d6604d', // Mediterranean
  '#f3d9b8', // deserts
  '#c51b7d' // mangroves
];
