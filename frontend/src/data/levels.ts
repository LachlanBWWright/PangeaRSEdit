export interface Level {
  id: string;
  name: string;
  game: string;
  gameDisplayName: string;
  summary: string;
  description: string;
  category?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  terFile: string;
  rsrcFile?: string;
}

export const levelsData: Level[] = [
  // Billy Frontier
  {
    id: 'billy-swamp-duel',
    name: 'Swamp Duel',
    game: 'billyFrontier',
    gameDisplayName: 'Billy Frontier',
    category: 'Duel',
    difficulty: 'Medium',
    summary: 'Face off in a swampy showdown where quick reflexes determine the victor.',
    description: 'Set in the murky depths of a Louisiana-style swamp, this level features atmospheric lighting, fog effects, and challenging terrain. Navigate through cypress trees and muddy waters while engaging in intense duels. The environment provides both cover and obstacles, making positioning crucial for victory.',
    terFile: '/assets/billyFrontier/terrain/swamp_duel.ter',
    rsrcFile: '/assets/billyFrontier/terrain/swamp_duel.ter.rsrc'
  },
  {
    id: 'billy-swamp-shootout',
    name: 'Swamp Shootout',
    game: 'billyFrontier',
    gameDisplayName: 'Billy Frontier',
    category: 'Shootout',
    difficulty: 'Hard',
    summary: 'Multiple opponents in a dangerous swamp environment with limited visibility.',
    description: 'An intense multi-enemy encounter set in treacherous swampland. Heavy fog reduces visibility while multiple enemies attack from various positions. Players must use the environment strategically, utilizing fallen logs and vegetation for cover while managing ammunition carefully.',
    terFile: '/assets/billyFrontier/terrain/swamp_shootout.ter',
    rsrcFile: '/assets/billyFrontier/terrain/swamp_shootout.ter.rsrc'
  },
  {
    id: 'billy-town-duel',
    name: 'Town Duel',
    game: 'billyFrontier',
    gameDisplayName: 'Billy Frontier',
    category: 'Duel',
    difficulty: 'Easy',
    summary: 'Classic western duel in the middle of a frontier town.',
    description: 'Experience the quintessential Western showdown in a dusty frontier town. This level features classic western architecture, including a saloon, general store, and sheriff\'s office. The open town square provides a clear view of your opponent, making this an ideal level for practicing duel mechanics.',
    terFile: '/assets/billyFrontier/terrain/town_duel.ter',
    rsrcFile: '/assets/billyFrontier/terrain/town_duel.ter.rsrc'
  },
  {
    id: 'billy-town-stampede',
    name: 'Town Stampede',
    game: 'billyFrontier',
    gameDisplayName: 'Billy Frontier',
    category: 'Stampede',
    difficulty: 'Medium',
    summary: 'Dodge and weave through a cattle stampede in the town streets.',
    description: 'Chaos erupts as a herd of cattle storms through the main street of the frontier town. Players must navigate between buildings, use doorways and alleys for cover, and time their movements carefully to avoid being trampled. Features dynamic cattle AI and destructible environmental elements.',
    terFile: '/assets/billyFrontier/terrain/town_stampede.ter',
    rsrcFile: '/assets/billyFrontier/terrain/town_stampede.ter.rsrc'
  },

  // Bugdom
  {
    id: 'bugdom-lawn',
    name: 'The Lawn',
    game: 'bugdom',
    gameDisplayName: 'Bugdom',
    category: 'Adventure',
    difficulty: 'Easy',
    summary: 'Start your adventure in a peaceful suburban lawn filled with friendly creatures.',
    description: 'Begin your journey as Rollie McFly in this introductory level set in a lush suburban lawn. Meet helpful characters, learn basic game mechanics, and discover the beauty of the bug world. Features tutorial elements, safe exploration areas, and introduces key gameplay concepts like collecting items and basic platforming.',
    terFile: '/assets/bugdom/terrain/Lawn.ter.rsrc'
  },
  {
    id: 'bugdom-anthill',
    name: 'Ant Hill',
    game: 'bugdom',
    gameDisplayName: 'Bugdom',
    category: 'Underground',
    difficulty: 'Medium',
    summary: 'Navigate the complex tunnel system of a massive ant colony.',
    description: 'Venture deep into the underground ant colony with its maze-like tunnel systems. This level features multiple pathways, secret chambers, and encounters with various ant species. Players must solve navigation puzzles while avoiding hostile worker ants and finding the path to the queen\'s chamber.',
    terFile: '/assets/bugdom/terrain/AntHill.ter.rsrc'
  },
  {
    id: 'bugdom-pond',
    name: 'The Pond',
    game: 'bugdom',
    gameDisplayName: 'Bugdom',
    category: 'Water',
    difficulty: 'Medium',
    summary: 'Explore the aquatic ecosystem around a serene garden pond.',
    description: 'Experience the aquatic side of the bug world around a beautiful garden pond. Lily pads serve as platforms while water striders patrol the surface. Dive underwater to discover hidden areas and face aquatic predators. Features unique water-based physics and swimming mechanics.',
    terFile: '/assets/bugdom/terrain/Pond.ter.rsrc'
  },
  {
    id: 'bugdom-beehive',
    name: 'Bee Hive',
    game: 'bugdom',
    gameDisplayName: 'Bugdom',
    category: 'Aerial',
    difficulty: 'Hard',
    summary: 'Infiltrate the busy bee hive and face the challenge of aerial combat.',
    description: 'Navigate the hexagonal chambers of an active bee hive. This vertical level emphasizes aerial movement and timing as you avoid worker bees and navigate through honey-coated passages. Features complex 3D navigation, multiple levels of hexagonal chambers, and culminates in an encounter with guard bees.',
    terFile: '/assets/bugdom/terrain/BeeHive.ter.rsrc'
  },

  // Bugdom 2
  {
    id: 'bugdom2-garden',
    name: 'Garden Level',
    game: 'bugdom2',
    gameDisplayName: 'Bugdom 2',
    category: 'Adventure',
    difficulty: 'Easy',
    summary: 'Skip\'s adventure begins in a colorful backyard garden.',
    description: 'Start Skip\'s new adventure in a vibrant backyard garden. This level introduces the new mechanics of Bugdom 2, including improved movement controls and interaction with garden plants and flowers. Meet new characters and discover the enhanced graphics and environmental details that make this garden come alive.',
    terFile: '/assets/bugdom2/terrain/Level1_Garden.ter',
    rsrcFile: '/assets/bugdom2/terrain/Level1_Garden.ter.rsrc'
  },
  {
    id: 'bugdom2-sidewalk',
    name: 'Sidewalk Adventure',
    game: 'bugdom2',
    gameDisplayName: 'Bugdom 2',
    category: 'Urban',
    difficulty: 'Medium',
    summary: 'Navigate the dangerous concrete jungle of suburban sidewalks.',
    description: 'Travel along suburban sidewalks where the scale makes everyday objects into massive obstacles. Dodge pedestrians, navigate around fire hydrants, and use storm drains as pathways. This level emphasizes the tiny scale of bug life in the human world, featuring realistic urban environments.',
    terFile: '/assets/bugdom2/terrain/Level2_SideWalk.ter',
    rsrcFile: '/assets/bugdom2/terrain/Level2_SideWalk.ter.rsrc'
  },
  {
    id: 'bugdom2-playroom',
    name: 'Playroom Chaos',
    game: 'bugdom2',
    gameDisplayName: 'Bugdom 2',
    category: 'Indoor',
    difficulty: 'Medium',
    summary: 'Adventure through a child\'s playroom filled with toys and obstacles.',
    description: 'Explore a child\'s chaotic playroom where toys become mountains and building blocks create maze-like structures. Navigate between toy cars, scale action figures, and avoid the dangers of moving toy trains. Features colorful environments and creative use of everyday toys as level geometry.',
    terFile: '/assets/bugdom2/terrain/Level5_Playroom.ter',
    rsrcFile: '/assets/bugdom2/terrain/Level5_Playroom.ter.rsrc'
  },
  {
    id: 'bugdom2-garbage',
    name: 'Garbage Adventure',
    game: 'bugdom2',
    gameDisplayName: 'Bugdom 2',
    category: 'Urban',
    difficulty: 'Hard',
    summary: 'Survive the hostile environment of a garbage dump.',
    description: 'Navigate through a dangerous garbage dump environment where refuse creates both opportunities and hazards. Climb trash heaps, avoid environmental dangers, and discover that even waste can harbor life. This challenging level features complex vertical navigation and environmental puzzles.',
    terFile: '/assets/bugdom2/terrain/Level8_Garbage.ter',
    rsrcFile: '/assets/bugdom2/terrain/Level8_Garbage.ter.rsrc'
  },

  // Cro-Mag Rally
  {
    id: 'cromag-jungle',
    name: 'Stone Age Jungle',
    game: 'croMag',
    gameDisplayName: 'Cro-Mag Rally',
    category: 'Stone Age',
    difficulty: 'Easy',
    summary: 'Race through dense prehistoric jungles with primitive vehicles.',
    description: 'Begin your time-traveling racing adventure in the Stone Age jungle. Navigate through dense vegetation, avoid dinosaurs, and master the handling of primitive stone-wheeled vehicles. This introductory racing level features lush jungle environments, prehistoric creatures, and introduces the unique physics of early automotive technology.',
    terFile: '/assets/croMag/terrain/StoneAge_Jungle.ter',
    rsrcFile: '/assets/croMag/terrain/StoneAge_Jungle.ter.rsrc'
  },
  {
    id: 'cromag-egypt',
    name: 'Bronze Age Egypt',
    game: 'croMag',
    gameDisplayName: 'Cro-Mag Rally',
    category: 'Bronze Age',
    difficulty: 'Medium',
    summary: 'Race past pyramids and through ancient Egyptian cities.',
    description: 'Experience the grandeur of ancient Egypt as you race through desert landscapes dotted with massive pyramids and sphinxes. Navigate sandy terrain that affects vehicle handling, avoid construction sites of famous monuments, and race through bustling ancient cities along the Nile.',
    terFile: '/assets/croMag/terrain/BronzeAge_Egypt.ter',
    rsrcFile: '/assets/croMag/terrain/BronzeAge_Egypt.ter.rsrc'
  },
  {
    id: 'cromag-atlantis',
    name: 'Iron Age Atlantis',
    game: 'croMag',
    gameDisplayName: 'Cro-Mag Rally',
    category: 'Iron Age',
    difficulty: 'Hard',
    summary: 'Race through the legendary underwater city before it sinks.',
    description: 'Experience the mythical city of Atlantis in its final glory before the great catastrophe. This unique level features both surface and underwater racing sections, advanced ancient technology, and stunning aquatic environments. Master the challenge of underwater vehicle physics and navigate through the city\'s complex architecture.',
    terFile: '/assets/croMag/terrain/IronAge_Atlantis.ter',
    rsrcFile: '/assets/croMag/terrain/IronAge_Atlantis.ter.rsrc'
  },
  {
    id: 'cromag-battle-coliseum',
    name: 'Battle Coliseum',
    game: 'croMag',
    gameDisplayName: 'Cro-Mag Rally',
    category: 'Battle',
    difficulty: 'Hard',
    summary: 'Gladiatorial racing combat in a massive ancient arena.',
    description: 'Enter the ultimate test of racing and combat skills in this massive coliseum. This battle arena features multiple levels, destructible barriers, and weapon pickups. Race against multiple opponents while engaging in vehicular combat, using the arena\'s architecture to gain tactical advantages.',
    terFile: '/assets/croMag/terrain/Battle_Coliseum.ter',
    rsrcFile: '/assets/croMag/terrain/Battle_Coliseum.ter.rsrc'
  },

  // Nanosaur 2
  {
    id: 'nanosaur2-level1',
    name: 'Hatchling Valley',
    game: 'nanosaur2',
    gameDisplayName: 'Nanosaur 2',
    category: 'Adventure',
    difficulty: 'Easy',
    summary: 'Begin your prehistoric adventure in a peaceful valley.',
    description: 'Start your journey as a newly hatched Nanosaur in this peaceful valley setting. Learn the basics of flight, combat, and navigation while exploring a beautiful prehistoric landscape. Features gentle learning curves, stunning environments, and introduces the core mechanics of the Nanosaur experience.',
    terFile: '/assets/nanosaur2/terrain/level1.ter',
    rsrcFile: '/assets/nanosaur2/terrain/level1.ter.rsrc'
  },
  {
    id: 'nanosaur2-level2',
    name: 'Crystal Caves',
    game: 'nanosaur2',
    gameDisplayName: 'Nanosaur 2',
    category: 'Underground',
    difficulty: 'Medium',
    summary: 'Navigate through spectacular underground crystal formations.',
    description: 'Explore breathtaking underground caverns filled with massive crystal formations. This level challenges your aerial navigation skills as you fly through tight passages and around sharp crystal spires. Features unique lighting effects, echo chambers, and hidden passages containing valuable power-ups.',
    terFile: '/assets/nanosaur2/terrain/level2.ter',
    rsrcFile: '/assets/nanosaur2/terrain/level2.ter.rsrc'
  },
  {
    id: 'nanosaur2-race1',
    name: 'Valley Racing Circuit',
    game: 'nanosaur2',
    gameDisplayName: 'Nanosaur 2',
    category: 'Racing',
    difficulty: 'Medium',
    summary: 'Fast-paced aerial racing through scenic valleys.',
    description: 'Test your flying skills in this high-speed aerial racing circuit. Navigate through checkpoint rings while maintaining maximum speed through valleys and around mountain peaks. Features time trials, multiple racing lines, and spectacular scenic views of the prehistoric world.',
    terFile: '/assets/nanosaur2/terrain/race1.ter',
    rsrcFile: '/assets/nanosaur2/terrain/race1.ter.rsrc'
  },
  {
    id: 'nanosaur2-battle1',
    name: 'Volcanic Battlefield',
    game: 'nanosaur2',
    gameDisplayName: 'Nanosaur 2',
    category: 'Combat',
    difficulty: 'Hard',
    summary: 'Intense aerial combat around active volcanic formations.',
    description: 'Engage in fierce aerial combat around active volcanoes and lava flows. This challenging level features multiple enemy types, environmental hazards from volcanic activity, and requires mastery of both combat and evasive maneuvers. Navigate through ash clouds, avoid lava geysers, and defeat waves of enemy creatures.',
    terFile: '/assets/nanosaur2/terrain/battle1.ter',
    rsrcFile: '/assets/nanosaur2/terrain/battle1.ter.rsrc'
  },

  // Otto Matic
  {
    id: 'otto-farm',
    name: 'Earth Farm',
    game: 'ottoMatic',
    gameDisplayName: 'Otto Matic',
    category: 'Earth',
    difficulty: 'Easy',
    summary: 'Protect the peaceful Earth farm from alien invasion.',
    description: 'Begin Otto\'s heroic quest on a peaceful Earth farm that\'s under alien attack. This introductory level teaches basic movement, shooting, and interaction mechanics while showcasing beautiful rural environments. Defend farm animals, navigate through barns and fields, and face your first alien encounters.',
    terFile: '/assets/ottoMatic/terrain/EarthFarm.ter',
    rsrcFile: '/assets/ottoMatic/terrain/EarthFarm.ter.rsrc'
  },
  {
    id: 'otto-jungle',
    name: 'Jungle Planet',
    game: 'ottoMatic',
    gameDisplayName: 'Otto Matic',
    category: 'Alien World',
    difficulty: 'Medium',
    summary: 'Explore a lush alien jungle filled with dangerous creatures.',
    description: 'Venture into the dense alien jungle where exotic plants and dangerous creatures await. This level features complex vertical navigation through jungle canopies, vine swinging mechanics, and encounters with unique alien wildlife. Navigate through ancient alien ruins hidden within the jungle depths.',
    terFile: '/assets/ottoMatic/terrain/Jungle.ter',
    rsrcFile: '/assets/ottoMatic/terrain/Jungle.ter.rsrc'
  },
  {
    id: 'otto-blob-world',
    name: 'Blob World',
    game: 'ottoMatic',
    gameDisplayName: 'Otto Matic',
    category: 'Alien World',
    difficulty: 'Hard',
    summary: 'Navigate the bizarre gelatinous landscape of the Blob Planet.',
    description: 'Experience the strangest alien environment in Otto\'s adventure - a world made entirely of organic, blob-like material. This unique level features bouncy terrain, morphing platforms, and blob-based alien creatures. Master the unusual physics of this gelatinous world while battling through increasingly challenging alien encounters.',
    terFile: '/assets/ottoMatic/terrain/BlobWorld.ter',
    rsrcFile: '/assets/ottoMatic/terrain/BlobWorld.ter.rsrc'
  },
  {
    id: 'otto-brain-boss',
    name: 'Brain Boss Battle',
    game: 'ottoMatic',
    gameDisplayName: 'Otto Matic',
    category: 'Boss Fight',
    difficulty: 'Hard',
    summary: 'Face the ultimate alien intelligence in an epic boss battle.',
    description: 'Confront the mastermind behind the alien invasion in this climactic boss battle. The Brain Boss features multiple attack phases, environmental hazards, and requires mastery of all of Otto\'s abilities. This challenging encounter takes place in a high-tech alien facility with complex architecture and deadly traps.',
    terFile: '/assets/ottoMatic/terrain/BrainBoss.ter',
    rsrcFile: '/assets/ottoMatic/terrain/BrainBoss.ter.rsrc'
  }
];

export const getGameDisplayName = (game: string): string => {
  const gameMap: Record<string, string> = {
    'billyFrontier': 'Billy Frontier',
    'bugdom': 'Bugdom',
    'bugdom2': 'Bugdom 2',
    'croMag': 'Cro-Mag Rally',
    'nanosaur': 'Nanosaur',
    'nanosaur2': 'Nanosaur 2',
    'ottoMatic': 'Otto Matic'
  };
  return gameMap[game] || game;
};

export const getGamesByCategory = () => {
  const games = Array.from(new Set(levelsData.map(level => level.game)));
  return games.map(game => ({
    id: game,
    name: getGameDisplayName(game),
    levels: levelsData.filter(level => level.game === game)
  }));
};