/**
 * NPCRoster defines the 13 characters for Hintz Manor:
 * - 1 Host / Victim (Lord Reginald Hintz)
 * - 6 Domestic Staff (Butler, Housekeeper, Chef, Maid, Valet, Gardener)
 * - 6 High-Society Guests (Professor, General, Actress, Lawyer, Heiress, Doctor)
 */
export const NPC_ROSTER = [
  {
    id: 'lord-hintz',
    name: 'Lord Reginald Hintz',
    title: 'Lord of Hintz Manor',
    role: 'Host / Victim',
    category: 'Host',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'The wealthy and enigmatic owner of Hintz Manor. Known for his vast art collection, hidden debt, and rumoured sudden changes to his family testament.',
    personality: 'Arrogant, secretive, and demanding.',
    startingRoom: 'Study'
  },
  {
    id: 'butler-higgins',
    name: 'Arthur Higgins',
    title: 'Head Butler',
    role: 'Staff',
    category: 'Staff',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'Has served Hintz Manor for thirty years. Knows every secret passage, keyhole, and scandal within the estate.',
    personality: 'Impeccably formal, watchful, and fiercely loyal to the manor reputation.',
    startingRoom: 'Hall'
  },
  {
    id: 'housekeeper-gable',
    name: 'Mrs. Martha Gable',
    title: 'Head Housekeeper',
    role: 'Staff',
    category: 'Staff',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'Manages the linen, keys, and domestic affairs. Recently discovered missing silverware and forged financial ledgers.',
    personality: 'Stern, sharp-tongued, and observant.',
    startingRoom: 'Servants Quarters'
  },
  {
    id: 'chef-henri',
    name: 'Chef Henri Laurent',
    title: 'Master Chef',
    role: 'Staff',
    category: 'Staff',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'A fiery French culinary master with a dark past. Secretly owes vast sums to underground syndicate gamblers.',
    personality: 'Passionate, volatile, and proud.',
    startingRoom: 'Kitchen'
  },
  {
    id: 'maid-clara',
    name: 'Clara Vance',
    title: 'Head Parlor Maid',
    role: 'Staff',
    category: 'Staff',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'Quiet and unassuming, Clara hears every conversation whispered behind heavy velvet curtains.',
    personality: 'Timid on the surface, calculating underneath.',
    startingRoom: 'Dining Room'
  },
  {
    id: 'valet-james',
    name: 'James Sterling',
    title: 'Personal Valet',
    role: 'Staff',
    category: 'Staff',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'Lord Hintz’s private valet. Holds compromising love letters between high-society guests.',
    personality: 'Smooth-talking, ambitious, and stealthy.',
    startingRoom: 'Billiard Room'
  },
  {
    id: 'gardener-thomas',
    name: 'Thomas Thorn',
    title: 'Head Gardener',
    role: 'Staff',
    category: 'Staff',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'Tends the conservatory poisons, nightshades, and estate grounds. Secretly knows who dug the midnight graves.',
    personality: 'Gruff, solitary, and quiet.',
    startingRoom: 'Conservatory'
  },
  {
    id: 'prof-sterling',
    name: 'Prof. Thaddeus Sterling',
    title: 'Eccentric Antiquarian',
    role: 'Guest',
    category: 'Guest',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'A disgraced university professor obsessed with ancient occult artifacts allegedly buried in Hintz Manor’s cellar.',
    personality: 'Obsessive, nervous, and articulate.',
    startingRoom: 'Library'
  },
  {
    id: 'gen-vance',
    name: 'Gen. Alistair Vance',
    title: 'Retired Army General',
    role: 'Guest',
    category: 'Guest',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'Decorated military officer with a crippling gambling habit and an unresolved grudge from the colonial wars.',
    personality: 'Commanding, impatient, and rigid.',
    startingRoom: 'Lounge'
  },
  {
    id: 'miss-vivienne',
    name: 'Miss Vivienne Duclair',
    title: 'Glamorous Actress',
    role: 'Guest',
    category: 'Guest',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'A famous theater star whose lavish lifestyle conceals mounting blackmail demands from an unknown extortionist.',
    personality: 'Dramatic, charming, and guarded.',
    startingRoom: 'Ballroom'
  },
  {
    id: 'lawyer-blackwood',
    name: 'Julian Blackwood, Esq.',
    title: 'Family Attorney',
    role: 'Guest',
    category: 'Guest',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'The cunning lawyer handling Lord Hintz’s revised last will and testament. Would profit immensely from a sudden demise.',
    personality: 'Cold, precise, and persuasive.',
    startingRoom: 'Study'
  },
  {
    id: 'lady-eleanor',
    name: 'Lady Eleanor Hintz',
    title: 'Estranged Aristocrat',
    role: 'Guest',
    category: 'Guest',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'Lord Hintz’s estranged sister who claims half the estate belonged to her late husband.',
    personality: 'Haughty, vindictive, and sharp.',
    startingRoom: 'Conservatory'
  },
  {
    id: 'dr-aris',
    name: 'Dr. Charles Aris',
    title: 'Manor Physician',
    role: 'Guest',
    category: 'Guest',
    avatar: 'icons/svg/mystery-man.svg',
    bio: 'The family doctor with access to lethal medical narcotics and a suspicious history of sudden patient deaths.',
    personality: 'Calm, clinical, and enigmatic.',
    startingRoom: 'Library'
  }
];
