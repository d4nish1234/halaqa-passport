
const airplaneForms = [
  require('../../assets/avatars/airplane-1/01.png'),
  require('../../assets/avatars/airplane-1/02.png'),
  require('../../assets/avatars/airplane-1/03.png'),
  require('../../assets/avatars/airplane-1/04.png'),
  require('../../assets/avatars/airplane-1/05.png'),
  require('../../assets/avatars/airplane-1/06.png'),
  require('../../assets/avatars/airplane-1/07.png'),
  require('../../assets/avatars/airplane-1/08.png'),
  require('../../assets/avatars/airplane-1/09.png'),
  require('../../assets/avatars/airplane-1/10.png'),
];


const earthForms = [
  require('../../assets/avatars/earth-1/01.png'),
  require('../../assets/avatars/earth-1/02.png'),
  require('../../assets/avatars/earth-1/03.png'),
  require('../../assets/avatars/earth-1/04.png'),
  require('../../assets/avatars/earth-1/05.png'),
  require('../../assets/avatars/earth-1/06.png'),
  require('../../assets/avatars/earth-1/07.png'),
  require('../../assets/avatars/earth-1/08.png'),
  require('../../assets/avatars/earth-1/09.png'),
  require('../../assets/avatars/earth-1/10.png'),
];

const flowerForms = [
  require('../../assets/avatars/flower-1/01.png'),
  require('../../assets/avatars/flower-1/02.png'),
  require('../../assets/avatars/flower-1/03.png'),
  require('../../assets/avatars/flower-1/04.png'),
  require('../../assets/avatars/flower-1/05.png'),
  require('../../assets/avatars/flower-1/06.png'),
  require('../../assets/avatars/flower-1/07.png'),
  require('../../assets/avatars/flower-1/08.png'),
  require('../../assets/avatars/flower-1/09.png'),
  require('../../assets/avatars/flower-1/10.png'),
];

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

const robotForms = [
  require('../../assets/avatars/robot-1/01.png'),
  require('../../assets/avatars/robot-1/02.png'),
  require('../../assets/avatars/robot-1/03.png'),
  require('../../assets/avatars/robot-1/04.png'),
  require('../../assets/avatars/robot-1/05.png'),
  require('../../assets/avatars/robot-1/06.png'),
  require('../../assets/avatars/robot-1/07.png'),
  require('../../assets/avatars/robot-1/08.png'),
  require('../../assets/avatars/robot-1/09.png'),
  require('../../assets/avatars/robot-1/10.png'),
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
    id: 'flower-1',
    name: 'Flower',
    forms: flowerForms,
  },
  {
    id: 'airplane-1',
    name: 'Airplane',
    forms: airplaneForms,
  },
  {
    id: 'earth-1',
    name: 'Earth',
    forms: earthForms,
  },
  {
    id: 'robot-1',
    name: 'Robot',
    forms: robotForms,
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
