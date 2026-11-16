import DangerousGaryDamageMessageData from "./models/damage-message.mjs"

/**
 * Actions des cartes de dégâts : appliquer les dégâts aux cibles, lancer la sauvegarde de Force d'une cible.
 * La carte est mise à jour sur place. Un joueur qui ne peut pas modifier une cible ou la carte passe par le MJ actif (requêtes).
 */
export class DamageCard {
  static QUERY_APPLY = "dangerousgary.applyDamage"

  static QUERY_MARK_SAVE = "dangerousgary.markStrSave"

  /**
   * Décrit un token ciblé : l'acteur, son image, son armure et les dégâts réels qu'il subit.
   * @param {Token} token Le token ciblé.
   * @param {number} total Le total du jet de dégâts.
   * @returns {object|null} Les données de la cible enregistrées dans la carte, ou null sans acteur.
   */
  static getTargetInfo(token, total) {
    const actor = token?.actor
    if (!actor) return null
    const armour = actor.armour
    return {
      uuid: actor.uuid,
      tokenUuid: token.document.uuid,
      name: token.document.name ?? actor.name,
      img: token.document.texture.src ?? actor.img,
      type: actor.type,
      armour,
      real: Math.max(0, total - armour),
    }
  }

  /**
   * Les cibles de l'utilisateur pour un jet de dégâts.
   * @param {number} total Le total du jet de dégâts.
   * @returns {object[]}
   */
  static getTargets(total) {
    return Array.from(game.user.targets)
      .map((token) => DamageCard.getTargetInfo(token, total))
      .filter((target) => target)
  }

  /**
   * Applique les dégâts de la carte aux cibles qui ne les ont pas encore reçus.
   * L'utilisateur le fait lui-même s'il possède toutes ces cibles, sinon il le demande au MJ actif.
   * Sans MJ actif, la carte reste en attente : le MJ pourra les appliquer depuis la carte.
   * @param {ChatMessage} message La carte de dégâts.
   * @returns {Promise<void>}
   */
  static async apply(message) {
    if (message?.type !== "damage" || !message.system.hasPendingTargets) return
    const pending = message.system.targets.filter((t) => !t.applied)
    const ownsAll = pending.every((t) => fromUuidSync(t.uuid)?.isOwner)
    if (ownsAll && message.canUserModify(game.user, "update")) {
      await DamageCard.#applyToTargets(message)
      return
    }
    const gm = game.users.activeGM
    if (!gm) {
      ui.notifications.warn("DANGEROUSGARY.Damage.NoActiveGM", { localize: true })
      return
    }
    await gm.query(DamageCard.QUERY_APPLY, { messageId: message.id })
  }

  /**
   * Retire les dégâts des PV puis de la Force de chaque cible en attente, et enregistre le résultat dans la carte.
   * L'armure et les dégâts réels sont recalculés depuis l'acteur.
   * @param {ChatMessage} message La carte de dégâts.
   * @returns {Promise<void>}
   */
  static async #applyToTargets(message) {
    const targets = message.system.toObject().targets
    for (const target of targets) {
      if (target.applied) continue
      const actor = await fromUuid(target.uuid)
      if (!actor) {
        ui.notifications.warn(game.i18n.format("DANGEROUSGARY.Damage.TargetNotFound", { name: target.name }))
        continue
      }
      target.armour = actor.armour
      target.real = Math.max(0, message.system.total - target.armour)
      Object.assign(target, await actor.applyDamage(target.real), { applied: true })
    }
    await message.update({ "system.targets": targets })
  }

  /**
   * Requête "dangerousgary.applyDamage" côté MJ : seul l'auteur de la carte peut demander l'application de ses dégâts.
   * @param {object} data
   * @param {string} data.messageId L'id de la carte.
   * @param {object} context
   * @param {User} context.user L'utilisateur qui a envoyé la requête.
   * @returns {Promise<boolean>} Les dégâts ont-ils été appliqués.
   */
  static async _handleApplyQuery({ messageId }, { user }) {
    const message = game.messages.get(messageId)
    if (message?.type !== "damage" || message.author?.id !== user.id) return false
    if (!message.system.hasPendingTargets) return false
    await DamageCard.#applyToTargets(message)
    return true
  }

  /**
   * Lance la sauvegarde de Force d'une cible dont les dégâts ont débordé sur la Force, puis le note sur la carte.
   * @param {ChatMessage} message La carte de dégâts.
   * @param {number} index L'indice de la cible dans la carte.
   * @returns {Promise<void>}
   */
  static async rollStrSave(message, index) {
    const target = message.system.targets[index]
    if (!target || !DangerousGaryDamageMessageData.canRollStrSave(target)) return
    const actor = await fromUuid(target.uuid)
    if (!actor) return
    await actor.rollSave("str")
    if (message.canUserModify(game.user, "update")) {
      await DamageCard.#markStrSave(message, index)
      return
    }
    await game.users.activeGM?.query(DamageCard.QUERY_MARK_SAVE, { messageId: message.id, index })
  }

  /**
   * Note sur la carte que la sauvegarde de Force d'une cible a été lancée.
   * @param {ChatMessage} message La carte de dégâts.
   * @param {number} index L'indice de la cible dans la carte.
   * @returns {Promise<void>}
   */
  static async #markStrSave(message, index) {
    const targets = message.system.toObject().targets
    targets[index].saveRolled = true
    await message.update({ "system.targets": targets })
  }

  /**
   * Requête "dangerousgary.markStrSave" côté MJ : demandée par un joueur qui peut lancer la sauvegarde de la cible.
   * @param {object} data
   * @param {string} data.messageId L'id de la carte.
   * @param {number} data.index L'indice de la cible dans la carte.
   * @param {object} context
   * @param {User} context.user L'utilisateur qui a envoyé la requête.
   * @returns {Promise<boolean>} La carte a-t-elle été mise à jour.
   */
  static async _handleMarkSaveQuery({ messageId, index }, { user }) {
    const message = game.messages.get(messageId)
    if (message?.type !== "damage") return false
    const target = message.system.targets[index]
    if (!target || !DangerousGaryDamageMessageData.canRollStrSave(target, user)) return false
    await DamageCard.#markStrSave(message, index)
    return true
  }

  /**
   * Centre la vue sur le token d'une cible, et le sélectionne si l'utilisateur le possède.
   * @param {string} tokenUuid L'uuid du token.
   */
  static panToToken(tokenUuid) {
    const token = fromUuidSync(tokenUuid)?.object
    if (!token || token.document.parent !== canvas.scene) return
    if (token.isOwner) token.control({ releaseOthers: true })
    canvas.animatePan(token.center)
  }
}
