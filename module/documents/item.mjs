import { canManageAssassin, denyAssassin, isAssassinTalent } from "../assassin.mjs"

export default class DangerousGaryItem extends Item {
  testUserPermission(user, permission, options) {
    if (isAssassinTalent(this) && !user.isGM) return false
    return super.testUserPermission(user, permission, options)
  }

  async _preCreate(data, options, user) {
    if (isAssassinTalent(this)) {
      if (!user.isGM || (this.actor && !canManageAssassin(this.actor, user))) return denyAssassin()
      if (!this.actor) this.updateSource({ ownership: { default: 0 } }, { recursive: false })
    }
    return super._preCreate(data, options, user)
  }

  async _preUpdate(changes, options, user) {
    const next = foundry.utils.mergeObject(this.toObject(), foundry.utils.expandObject(changes), { inplace: false })
    if (!user.isGM && this.type === "artefact" && (this.system.allowedClasses.has("assassin") !== new Set(next.system.allowedClasses).has("assassin"))) return denyAssassin()
    if ((isAssassinTalent(this) || isAssassinTalent(next)) && !user.isGM) return denyAssassin()
    if (isAssassinTalent(next) && this.actor && !canManageAssassin(this.actor, user)) return denyAssassin()
    if (isAssassinTalent(next) && !this.actor && next.ownership && (next.ownership.default > 0 || game.users.some(u => !u.isGM && (next.ownership[u.id] ?? next.ownership.default ?? 0) > 0))) return denyAssassin()
    return super._preUpdate(changes, options, user)
  }

  async _preDelete(options, user) {
    if (isAssassinTalent(this) && !user.isGM) return denyAssassin()
    return super._preDelete(options, user)
  }
}
