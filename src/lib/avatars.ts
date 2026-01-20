const plantForms = [
  require('../../assets/avatars/plant-1/01.png'),
  require('../../assets/avatars/plant-1/02.png'),
  require('../../assets/avatars/plant-1/03.png'),
  require('../../assets/avatars/plant-1/04.png'),
  require('../../assets/avatars/plant-1/05.png'),
  require('../../assets/avatars/plant-1/06.png'),
  require('../../assets/avatars/plant-1/07.png'),
  require('../../assets/avatars/plant-1/08.png'),
  require('../../assets/avatars/plant-1/09.png'),
  require('../../assets/avatars/plant-1/10.png'),
  require('../../assets/avatars/plant-1/11.png'),
  require('../../assets/avatars/plant-1/12.png'),
];

const armadilloForms = [
  require('../../assets/avatars/armadillo-1/01.png'),
  require('../../assets/avatars/armadillo-1/02.png'),
  require('../../assets/avatars/armadillo-1/03.png'),
  require('../../assets/avatars/armadillo-1/04.png'),
  require('../../assets/avatars/armadillo-1/05.png'),
  require('../../assets/avatars/armadillo-1/06.png'),
  require('../../assets/avatars/armadillo-1/07.png'),
  require('../../assets/avatars/armadillo-1/08.png'),
];

const truckForms = [
  require('../../assets/avatars/truck-1/01.png'),
  require('../../assets/avatars/truck-1/02.png'),
  require('../../assets/avatars/truck-1/03.png'),
  require('../../assets/avatars/truck-1/04.png'),
  require('../../assets/avatars/truck-1/05.png'),
  require('../../assets/avatars/truck-1/06.png'),
  require('../../assets/avatars/truck-1/07.png'),
  require('../../assets/avatars/truck-1/08.png'),
];

const carForms = [
  require('../../assets/avatars/car-1/01.png'),
  require('../../assets/avatars/car-1/02.png'),
  require('../../assets/avatars/car-1/03.png'),
  require('../../assets/avatars/car-1/04.png'),
  require('../../assets/avatars/car-1/05.png'),
  require('../../assets/avatars/car-1/06.png'),
  require('../../assets/avatars/car-1/07.png'),
  require('../../assets/avatars/car-1/08.png'),
];

const treeForms = [
  require('../../assets/avatars/tree-1/01.png'),
  require('../../assets/avatars/tree-1/02.png'),
  require('../../assets/avatars/tree-1/03.png'),
  require('../../assets/avatars/tree-1/04.png'),
  require('../../assets/avatars/tree-1/05.png'),
  require('../../assets/avatars/tree-1/06.png'),
  require('../../assets/avatars/tree-1/07.png'),
  require('../../assets/avatars/tree-1/08.png'),
];

const pinkGemForms = [
  require('../../assets/avatars/pink-gem-1/01.png'),
  require('../../assets/avatars/pink-gem-1/02.png'),
  require('../../assets/avatars/pink-gem-1/03.png'),
  require('../../assets/avatars/pink-gem-1/04.png'),
  require('../../assets/avatars/pink-gem-1/05.png'),
  require('../../assets/avatars/pink-gem-1/06.png'),
  require('../../assets/avatars/pink-gem-1/07.png'),
  require('../../assets/avatars/pink-gem-1/08.png'),
];

export type AvatarDefinition = {
  id: string;
  name: string;
  forms: number[];
};

export const avatars: AvatarDefinition[] = [
  {
    id: 'plant-1',
    name: 'Plant',
    forms: plantForms,
  },
  {
    id: 'armadillo',
    name: 'Armadillo',
    forms: armadilloForms,
  },
  {
    id: 'truck-1',
    name: 'Truck',
    forms: truckForms,
  },
  {
    id: 'car-1',
    name: 'Car',
    forms: carForms,
  },
  {
    id: 'tree-1',
    name: 'Tree',
    forms: treeForms,
  },
  {
    id: 'pink-gem-1',
    name: 'Pink Gem',
    forms: pinkGemForms,
  },
];

export function getAvatarById(id: string | null | undefined): AvatarDefinition | null {
  if (!id) {
    return null;
  }
  return avatars.find((avatar) => avatar.id === id) ?? null;
}
