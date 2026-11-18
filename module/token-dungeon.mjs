/**
 * Pastille « Dans un Donjon » dessinée en haut à droite du token d'un personnage dont la case Donjon est cochée.
 * Même icône que sur la fiche (Font Awesome « dungeon », police chargée par Foundry), sur un disque violet.
 * Foundry n'offre pas d'emplacement libre pour une icône : la pastille est un enfant PIXI du token, mise à jour à chaque
 * rafraîchissement (refreshToken), y compris quand l'acteur change (le token reçoit redrawEffects).
 */

/** Caractère Font Awesome de l'icône « dungeon ». */
const GLYPH = ""

/** Couleur de la pastille, celle de la pastille de la fiche. */
const COLOR = 0x4a148c

/** Taille de la pastille, en part du plus petit côté du token. */
const RATIO = 0.3

/**
 * Le personnage du token est-il dans un Donjon.
 * @param {Token} token
 * @returns {boolean}
 */
function inDungeon(token) {
  const actor = token.actor
  return actor?.type === "character" && !!actor.system.inDungeon
}

/**
 * Crée la pastille, ou la redessine si la taille du token a changé.
 * @param {Token} token
 * @returns {PIXI.Container}
 */
function badgeFor(token) {
  const size = Math.max(14, Math.round(Math.min(token.w, token.h) * RATIO))
  let badge = token.dangerousgaryDungeonBadge
  if (badge && !badge.destroyed && badge.dgSize === size) return badge
  if (badge && !badge.destroyed) badge.destroy({ children: true })

  badge = new PIXI.Container()
  badge.dgSize = size
  badge.eventMode = "none"
  const disc = new PIXI.Graphics()
  disc.beginFill(COLOR, 0.95).lineStyle(Math.max(1, size / 14), 0xffffff, 1).drawCircle(0, 0, size / 2).endFill()
  badge.addChild(disc)
  const icon = new foundry.canvas.containers.PreciseText(GLYPH, {
    fontFamily: "Font Awesome 7 Pro",
    fontWeight: "900",
    fontSize: Math.round(size * 0.55),
    fill: 0xffffff,
  })
  icon.anchor.set(0.5)
  badge.addChild(icon)
  token.addChild(badge)
  token.dangerousgaryDungeonBadge = badge
  return badge
}

/**
 * Affiche ou masque la pastille et la place en haut à droite du token.
 * @param {Token} token
 */
function refreshDungeonBadge(token) {
  const current = token.dangerousgaryDungeonBadge
  if (!inDungeon(token)) {
    if (current && !current.destroyed) current.visible = false
    return
  }
  const badge = badgeFor(token)
  badge.position.set(token.w - badge.dgSize / 2, badge.dgSize / 2)
  // Toujours au-dessus des autres éléments du token
  if (token.children.at(-1) !== badge) token.addChild(badge)
  badge.visible = true
}

/** Branche la pastille sur le dessin et le rafraîchissement des tokens. */
export function registerDungeonBadge() {
  Hooks.on("drawToken", refreshDungeonBadge)
  Hooks.on("refreshToken", refreshDungeonBadge)
  // La police solide n'est chargée qu'à sa première utilisation : la charger, puis redessiner les pastilles déjà affichées
  Hooks.once("ready", async () => {
    await document.fonts.load('900 16px "Font Awesome 7 Pro"', GLYPH).catch(() => null)
    for (const token of canvas.tokens?.placeables ?? []) {
      token.dangerousgaryDungeonBadge?.destroy({ children: true })
      refreshDungeonBadge(token)
    }
  })
}
