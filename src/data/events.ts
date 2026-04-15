// src/data/events.ts
// Event definitions, rotation logic, quiz questions, wheel sectors

import { CROPS } from './crops';
import { TREES } from './trees';
import { ANIMALS } from './animals';
import { RESOURCE_INFO } from './resources';
import { TRADE_BRUT_KEYS } from './trades';
import { CROP_REWARD_KEYS } from './trades';

// ========== EVENT DEFINITIONS ==========

export interface EventDef {
  id: string;
  emoji: string;
  name: string;
  rules: string;
  color: string;
  offset: number;
}

export const EVENTS: EventDef[] = [
  { id: 'quiz',      emoji: '\u{1F9E0}', name: 'Quizz Party',       rules: 'Reponds a des questions sur Farm Valley pour gagner des \u2B50', color: '#9b59b6', offset: 0 },
  { id: 'marche',    emoji: '\u{1F92A}', name: 'Marche Fou',        rules: 'Un marchand propose des offres absurdes ! Accepte ou refuse avant qu\'elles expirent.', color: '#e67e22', offset: 1 },
  { id: 'wheel',     emoji: '\u{1F3B0}', name: 'Roue de la Chance', rules: 'Tourne la roue pour gagner des ressources, des \u2B50 ou de l\'eau !', color: '#e74c3c', offset: 2 },
  { id: 'memory',    emoji: '\u{1F0CF}', name: 'Memory Farm',       rules: 'Retourne les cartes et trouve les paires d\'emojis ferme !', color: '#2ecc71', offset: 3 },
  { id: 'justeprix', emoji: '\u{1F4B0}', name: 'Le Juste Prix',     rules: 'Connais-tu les prix du marche ? Trouve le bon prix de vente !', color: '#3498db', offset: 4 },
  { id: 'combo',     emoji: '\u{1F446}', name: 'Combo Click',       rules: 'Clique le plus vite possible en 10 secondes !', color: '#e91e63', offset: 5 },
];

// ========== ROTATION ==========

export const EVENT_DURATION = 5; // 5 months active
export const EVENT_CYCLE = 6;    // 5 active + 1 cooldown

export interface EventInfo {
  active: boolean;
  remaining: number; // months remaining if active
  until: number;     // months until next activation if inactive
}

export function getEventInfo(month: number, offset: number): EventInfo {
  const cycle = ((month - 1 - offset) % EVENT_CYCLE + EVENT_CYCLE) % EVENT_CYCLE;
  if (cycle < EVENT_DURATION) {
    return { active: true, remaining: EVENT_DURATION - cycle, until: 0 };
  } else {
    return { active: false, remaining: 0, until: EVENT_CYCLE - cycle };
  }
}

// ========== WHEEL SECTORS ==========

export interface WheelSector {
  label: string;
  type: 'star' | 'water' | 'coins' | 'wood' | 'random' | 'nothing';
  quantity: number;
  color: string;
}

export const WHEEL_SECTORS: WheelSector[] = [
  { label: '\u2B50 1',          type: 'star',    quantity: 1,   color: '#f1c40f' },
  { label: '\u{1F4A7} 20',     type: 'water',   quantity: 20,  color: '#3498db' },
  { label: '\u274C Rien',       type: 'nothing', quantity: 0,   color: '#95a5a6' },
  { label: '\u{1F4B0} 200',    type: 'coins',   quantity: 200, color: '#e67e22' },
  { label: '\u{1FAB5} 10',     type: 'wood',    quantity: 10,  color: '#8d6e63' },
  { label: '\u274C Rien',       type: 'nothing', quantity: 0,   color: '#bdc3c7' },
  { label: '\u2B50 2',          type: 'star',    quantity: 2,   color: '#f39c12' },
  { label: '\u{1F381} Res x5', type: 'random',  quantity: 5,   color: '#9b59b6' },
  { label: '\u274C Rien',       type: 'nothing', quantity: 0,   color: '#95a5a6' },
  { label: '\u{1F4B0} 500',    type: 'coins',   quantity: 500, color: '#e74c3c' },
  { label: '\u{1F4A7} 50',     type: 'water',   quantity: 50,  color: '#2980b9' },
  { label: '\u{1F381} Res x10',type: 'random',  quantity: 10,  color: '#8e44ad' },
];

export const WHEEL_SPIN_COST = 50;

// ========== MEMORY FARM EMOJIS ==========

export const EVENT_MEMORY_EMOJIS = [
  '\u{1F955}', '\u{1F345}', '\u{1F33E}', '\u{1F95A}',
  '\u{1F34E}', '\u{1F353}', '\u{1F34B}', '\u{1F347}',
];

// ========== COMBO CLICK TIERS ==========

export interface ComboTier {
  minClicks: number;
  reward: number;
}

export const COMBO_TIERS: ComboTier[] = [
  { minClicks: 300, reward: 5000 },
  { minClicks: 250, reward: 2000 },
  { minClicks: 180, reward: 1000 },
  { minClicks: 120, reward: 500 },
  { minClicks: 80,  reward: 300 },
  { minClicks: 50,  reward: 150 },
  { minClicks: 20,  reward: 50 },
  { minClicks: 0,   reward: 10 },
];

export const COMBO_DURATION_MS = 10_000;

// ========== QUIZ QUESTIONS ==========

export interface QuizQuestion {
  q: string;
  type: 'vf' | 'choice';
  /** For vf: ['Vrai', 'Faux'], correct index 0=vrai, 1=faux */
  /** For choice: array of options */
  options: string[];
  answer: number; // correct option index
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // True/False questions about crops
  { q: 'Le ble est la premiere culture disponible.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le mais necessite le niveau 2 pour etre plante.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'La fraise necessite 5 arrosages pour pousser.', type: 'vf', options: ['Vrai', 'Faux'], answer: 1 },
  { q: 'Les arbres necessitent 4 arrosages.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'La citrouille est la culture la plus chere a planter.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'La fleur doree se vend le plus cher parmi les cultures.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le pommier est le premier arbre disponible.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'L\'olivier produit des noix de coco.', type: 'vf', options: ['Vrai', 'Faux'], answer: 1 },
  { q: 'La vigne produit du raisin.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le cocotier est disponible au niveau 18.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },

  // True/False questions about animals
  { q: 'La vache produit du lait.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'La poule est le premier animal disponible.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le mouton produit de la laine.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Les abeilles produisent du sucre.', type: 'vf', options: ['Vrai', 'Faux'], answer: 1 },
  { q: 'La chevre produit du lait de chevre.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le cochon produit de la viande de porc.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'La dinde produit des plumes.', type: 'vf', options: ['Vrai', 'Faux'], answer: 1 },
  { q: 'Le lapin produit de la fourrure.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },

  // True/False about game mechanics
  { q: 'Le puits donne de l\'eau gratuitement une fois repare.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Les fermiers produisent des ressources automatiquement.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Les ouvriers travaillent dans les ateliers.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le loyer augmente avec le niveau.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'On peut emprunter a la banque.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Les etoiles s\'obtiennent en completant des quetes.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le jardin decoratif fait 16x16.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Les batiments renoves du jardin donnent des recompenses mensuelles.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Les trades donnent +1 etoile chacun.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Il y a 10 mini-jeux differents.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Chaque mini-jeu a 100 niveaux.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le jeu a 6 evenements rotatifs.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },

  // True/False about ateliers
  { q: 'La laiterie transforme le lait en beurre.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le moulin transforme le ble en farine.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'La fromagerie necessite du lait de chevre.', type: 'vf', options: ['Vrai', 'Faux'], answer: 1 },
  { q: 'La cave a vin transforme le raisin en vin.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'La chocolaterie est l\'atelier le plus avance.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'L\'huilerie transforme les olives en huile.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },

  // Choice questions
  { q: 'Combien de cultures differentes existe-t-il ?', type: 'choice', options: ['10', '15', '20', '25'], answer: 0 },
  { q: 'Combien d\'arbres differents existe-t-il ?', type: 'choice', options: ['5', '10', '15', '20'], answer: 1 },
  { q: 'Combien d\'animaux differents existe-t-il ?', type: 'choice', options: ['10', '15', '20', '25'], answer: 2 },
  { q: 'Combien de ressources le jeu contient-il ?', type: 'choice', options: ['30', '45', '59', '75'], answer: 2 },
  { q: 'Combien d\'ateliers differents y a-t-il ?', type: 'choice', options: ['12', '18', '24', '30'], answer: 2 },
  { q: 'Un jour en jeu dure combien de temps reel ?', type: 'choice', options: ['1 min', '3 min', '5 min', '10 min'], answer: 2 },
  { q: 'Combien de jours fait un mois en jeu ?', type: 'choice', options: ['10', '20', '30', '60'], answer: 2 },
  { q: 'Combien de reparations faut-il pour le puits ?', type: 'choice', options: ['5', '10', '15', '20'], answer: 2 },
  { q: 'Combien de fermiers peut-on embaucher au max ?', type: 'choice', options: ['5', '10', '15', '20'], answer: 1 },
  { q: 'Combien de quetes sont generees par mois ?', type: 'choice', options: ['5', '8', '10', '15'], answer: 2 },
  { q: 'Combien de trades sont generes par lot ?', type: 'choice', options: ['5', '7', '9', '12'], answer: 2 },
  { q: 'La taille du jardin decoratif est de :', type: 'choice', options: ['8x8', '12x12', '16x16', '20x20'], answer: 2 },
  { q: 'Quelle culture se vend le plus cher ?', type: 'choice', options: ['Citrouille', 'Fleur doree', 'Champignon', 'Cerise'], answer: 1 },
  { q: 'Quel arbre se vend le plus cher ?', type: 'choice', options: ['Cocotier', 'Olivier', 'Manguier', 'Vigne'], answer: 1 },
  { q: 'Le fromage est produit par quel atelier ?', type: 'choice', options: ['Laiterie', 'Fromagerie', 'Moulin', 'Boulangerie'], answer: 1 },
  { q: 'Le vin est produit par quel atelier ?', type: 'choice', options: ['Pressoir', 'Brasserie', 'Cave a vin', 'Distillerie'], answer: 2 },

  // More varied questions
  { q: 'Les cultures necessitent combien d\'arrosages ?', type: 'choice', options: ['2', '3', '4', '5'], answer: 1 },
  { q: 'Combien d\'ouvriers max peut-on avoir ?', type: 'choice', options: ['5', '8', '10', '12'], answer: 2 },
  { q: 'L\'eau se regenere toutes les combien ?', type: 'choice', options: ['10s', '20s', '30s', '60s'], answer: 2 },
  { q: 'Combien d\'evenements rotatifs y a-t-il ?', type: 'choice', options: ['3', '4', '6', '8'], answer: 2 },
  { q: 'Un evenement dure combien de mois ?', type: 'choice', options: ['3', '4', '5', '6'], answer: 2 },
  { q: 'Combien de pieces coute un tour de roue ?', type: 'choice', options: ['20', '50', '100', '200'], answer: 1 },

  // More True/False
  { q: 'On peut vendre des ressources dans la boutique.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Les ameliorations de vitesse accelerent la pousse.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le loyer est gratuit au niveau 1.', type: 'vf', options: ['Vrai', 'Faux'], answer: 1 },
  { q: 'On peut mettre de l\'argent a la caisse d\'epargne.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Les mini-jeux recompensent des etoiles.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le snake est l\'un des 10 mini-jeux.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le demineur est un mini-jeu disponible.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le 2048 a toujours une grille 4x4.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Simon utilise 4 couleurs.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le Taquin est un puzzle coulissant.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Flood = remplir la grille d\'une seule couleur.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Le labyrinthe utilise un algorithme recursif.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Color Pattern montre un motif a memoriser.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },
  { q: 'Lights Out = eteindre toutes les lumieres.', type: 'vf', options: ['Vrai', 'Faux'], answer: 0 },

  // More choice questions about specifics
  { q: 'Quel est le cout du premier fermier ?', type: 'choice', options: ['1 000', '5 000', '10 000', '50 000'], answer: 2 },
  { q: 'Le cycle d\'un evenement dure combien de mois ?', type: 'choice', options: ['4', '5', '6', '8'], answer: 2 },
  { q: 'Combien d\'emplacements de ferme au depart ?', type: 'choice', options: ['6', '9', '12', '15'], answer: 2 },
  { q: 'Le nombre max de niveaux par mini-jeu est :', type: 'choice', options: ['50', '75', '100', '150'], answer: 2 },
  { q: 'Combo Click dure combien de secondes ?', type: 'choice', options: ['5', '10', '15', '30'], answer: 1 },
  { q: 'Memory Farm utilise combien de paires ?', type: 'choice', options: ['6', '8', '10', '12'], answer: 1 },
  { q: 'La roue de la chance a combien de secteurs ?', type: 'choice', options: ['8', '10', '12', '16'], answer: 2 },
];

// ========== JUSTE PRIX QUESTION GENERATION ==========

export interface JustePrixQuestion {
  q: string;
  options: number[];
  answer: number; // correct option index
}

export function generateJustePrixQuestions(): JustePrixQuestion[] {
  const questions: JustePrixQuestion[] = [];

  // Sell price questions for resources
  for (const [key, info] of Object.entries(RESOURCE_INFO)) {
    if (info.sellPrice <= 0) continue;
    const correct = info.sellPrice;
    const wrongs = [
      Math.max(1, Math.floor(correct * 0.5)),
      Math.floor(correct * 1.5),
      Math.floor(correct * 2.2),
    ];
    const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      q: `Prix de vente: ${info.emoji} ${info.name} ?`,
      options: opts,
      answer: opts.indexOf(correct),
    });
  }

  // Planting cost questions for crops
  for (const crop of CROPS) {
    const correct = crop.cost;
    const wrongs = [
      Math.max(1, Math.floor(correct * 0.6)),
      Math.floor(correct * 1.8),
      Math.floor(correct * 3),
    ];
    const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      q: `Cout de plantation: ${crop.emoji} ${crop.name} ?`,
      options: opts,
      answer: opts.indexOf(correct),
    });
  }

  // Planting cost for trees
  for (const tree of TREES) {
    const correct = tree.cost;
    const wrongs = [
      Math.max(1, Math.floor(correct * 0.5)),
      Math.floor(correct * 1.6),
      Math.floor(correct * 2.5),
    ];
    const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      q: `Cout de plantation: ${tree.emoji} ${tree.name} ?`,
      options: opts,
      answer: opts.indexOf(correct),
    });
  }

  // Animal buy cost
  for (const animal of ANIMALS) {
    const correct = animal.cost;
    const wrongs = [
      Math.max(1, Math.floor(correct * 0.4)),
      Math.floor(correct * 1.7),
      Math.floor(correct * 2.8),
    ];
    const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      q: `Cout d'achat: ${animal.emoji} ${animal.name} ?`,
      options: opts,
      answer: opts.indexOf(correct),
    });
  }

  return questions;
}

// ========== MARCHE FOU OFFER GENERATION ==========

export interface MarcheOffer {
  giveKey: string;
  giveQty: number;
  recvKey: string;
  recvQty: number;
  accepted: boolean;
}

export function generateMarcheOffers(): MarcheOffer[] {
  const allKeys = [...TRADE_BRUT_KEYS, ...CROP_REWARD_KEYS];
  const shuffled = allKeys.sort(() => Math.random() - 0.5);
  const count = 3 + Math.floor(Math.random() * 3); // 3-5 offers
  const offers: MarcheOffer[] = [];

  for (let i = 0; i < count && i * 2 + 1 < shuffled.length; i++) {
    const isGood = Math.random() < 0.5;
    const giveKey = shuffled[i * 2];
    const recvKey = shuffled[i * 2 + 1];
    let giveQty: number, recvQty: number;
    if (isGood) {
      giveQty = 1 + Math.floor(Math.random() * 3);
      recvQty = 10 + Math.floor(Math.random() * 40);
    } else {
      giveQty = 10 + Math.floor(Math.random() * 30);
      recvQty = 1 + Math.floor(Math.random() * 3);
    }
    offers.push({ giveKey, giveQty, recvKey, recvQty, accepted: false });
  }

  return offers;
}

/** Get random resource key for wheel "random" reward */
export function getRandomResourceKey(): string {
  const pool = [...TRADE_BRUT_KEYS, ...CROP_REWARD_KEYS];
  return pool[Math.floor(Math.random() * pool.length)];
}
