/** Shared policy for the GM-only NPC class. This hides UI, not client-side data. */
export const CLASS_ABILITIES = { cleric: "str", fighter: "str", paladin: "str", druid: "dex", monk: "dex", thief: "dex", bard: "wil", mage: "wil", ranger: "wil" }
export function isAssassinTalent(item) {
  return item?.type === "talent" && (item.system?.talentClass === "assassin" || (!item.system?.talentClass && item.flags?.["dg-boite-rouge-bleue"]?.npcClass === "assassin"))
}
export function hasAssassin(actor) {
  return Number(actor?.system?.classes?.assassin ?? 0) > 0 || Array.from(actor?.items ?? []).some(isAssassinTalent)
}
export function isNpc(actor) { return actor?.type === "character" && !actor.hasPlayerOwner && !playerOwnsSource(actor) }
export function canManageAssassin(actor, user = game.user) { return !!user?.isGM && isNpc(actor) }
export function denyAssassin() {
  ui.notifications.warn(game.i18n.localize(game.user.isGM ? "DANGEROUSGARY.Assassin.NpcOnly" : "DANGEROUSGARY.Assassin.Denied"))
  return false
}
/** Remove only the generated legacy Assassin sections; leave other authored powers intact. */
export function stripLegacyAssassin(html = "") {
  return html.replace(/<h3>Talents d[’']Assassin<\/h3>(?:\s*<p>[\s\S]*?<\/p>)?(?:\s*<ul>[\s\S]*?<\/ul>)?/gi, "")
    .replace(/<li>\s*<p>\s*<strong>Classe réservée aux PNJ<\/strong>\s*:[\s\S]*?<\/p>\s*<\/li>/gi, "")
    .replace(/<ul>\s*<\/ul>/gi, "")
}
export function visibleAssassinHtml(html = "", user = game.user) {
  if (user.isGM) return html
  return stripLegacyAssassin(html)
    .replace(/<(section|div)[^>]*data-assassin-secret[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<p\b[^>]*>[\s\S]*?<\/p>/g, paragraph => /\bAssassin\b/i.test(paragraph) ? "" : paragraph)
}
export function playerOwnsSource(source) {
  const ownership = source.ownership ?? {}
  return ownership.default >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER || game.users.some(user => !user.isGM && (ownership[user.id] ?? ownership.default ?? 0) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
}
export function actorUpdateAllowed(actor, changes, user) {
  const next = foundry.utils.mergeObject(actor.toObject(), foundry.utils.expandObject(changes), { inplace: false })
  const levelChanged = Number(next.system?.classes?.assassin ?? 0) !== Number(actor.system?.classes?.assassin ?? 0)
  if (!user.isGM && levelChanged) return denyAssassin()
  if (!user.isGM && changes.items && JSON.stringify(next.items.filter(isAssassinTalent)) !== JSON.stringify(Array.from(actor.items).filter(isAssassinTalent).map(i => i.toObject()))) return denyAssassin()
  if (hasAssassin(next) && next.type !== "character") return denyAssassin()
  if (hasAssassin(next) && playerOwnsSource(next) && ("ownership" in changes || levelChanged || !hasAssassin(actor))) return denyAssassin()
  return true
}
/** Keep macros generated for this class out of players’ directories and hotbars. */
export function secretMacroAllowed(macro, changes, options, userId) {
  const next = foundry.utils.mergeObject(macro.toObject(), foundry.utils.expandObject(changes), { inplace: false })
  if (!macro.getFlag("dangerousgary", "assassin") && !next.flags?.dangerousgary?.assassin) return true
  if (!game.users.get(userId)?.isGM) return denyAssassin()
  if (next.ownership?.default > 0 || game.users.some(user => !user.isGM && (next.ownership?.[user.id] ?? next.ownership?.default ?? 0) > 0)) return denyAssassin()
  return true
}
