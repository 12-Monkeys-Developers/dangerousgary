/**
 * États du système, proposés sur le HUD des tokens. Les identifiants dead, blind et invisible sont ceux du cœur (états spéciaux).
 * @type {Array<{id: string, name: string, img: string}>}
 */
export const STATUS_EFFECTS = [
  { id: "dead", name: "DANGEROUSGARY.Status.dead", img: "icons/svg/skull.svg" },
  { id: "unconscious", name: "DANGEROUSGARY.Status.unconscious", img: "icons/svg/unconscious.svg" },
  { id: "constrained", name: "DANGEROUSGARY.Status.constrained", img: "icons/svg/net.svg" },
  { id: "exalted", name: "DANGEROUSGARY.Status.exalted", img: "icons/svg/upgrade.svg" },
  { id: "unlucky", name: "DANGEROUSGARY.Status.unlucky", img: "icons/svg/card-joker.svg" },
  { id: "stunned", name: "DANGEROUSGARY.Status.stunned", img: "icons/svg/daze.svg" },
  { id: "slowed", name: "DANGEROUSGARY.Status.slowed", img: "icons/svg/anchor.svg" },
  { id: "blind", name: "DANGEROUSGARY.Status.blind", img: "icons/svg/blind.svg" },
  { id: "prone", name: "DANGEROUSGARY.Status.prone", img: "icons/svg/falling.svg" },
  { id: "paralysis", name: "DANGEROUSGARY.Status.paralysis", img: "icons/svg/paralysis.svg" },
  { id: "grappled", name: "DANGEROUSGARY.Status.grappled", img: "icons/svg/padlock.svg" },
  { id: "burning", name: "DANGEROUSGARY.Status.burning", img: "icons/svg/fire.svg" },
  { id: "poisoned", name: "DANGEROUSGARY.Status.poisoned", img: "icons/svg/poison.svg" },
  { id: "invisible", name: "DANGEROUSGARY.Status.invisible", img: "icons/svg/invisible.svg" },
]

/**
 * États qui rendent contraintes les attaques de celui qui les porte.
 * @type {string[]}
 */
export const CONSTRAINING_STATUSES = ["constrained", "stunned", "slowed", "blind"]

/** État qui rend exaltées les attaques de celui qui le porte. */
export const EXALTING_STATUS = "exalted"

/** État qui fait lancer deux dés aux sauvegardes et garder le pire. */
export const UNLUCKY_STATUS = "unlucky"

/**
 * Icône d'un effet continu selon ce qu'il fait perdre ou regagner.
 * @type {Record<string, string>}
 */
export const ONGOING_ICONS = {
  damage: "icons/svg/blood.svg",
  str: "icons/svg/degen.svg",
  dex: "icons/svg/degen.svg",
  wil: "icons/svg/degen.svg",
  xp: "icons/svg/degen.svg",
  heal: "icons/svg/regen.svg",
}
