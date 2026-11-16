import DangerousGaryDamageMessageData from "./models/damage-message.mjs"

/**
 * Actions des cartes de dégâts : appliquer les dégâts aux cibles, lancer la sauvegarde de Force d'une cible.
 * La carte est mise à jour sur place. Un joueur qui ne peut pas modifier une cible ou la carte passe par le MJ actif (requêtes).
 */
export class DamageCard {
  static QUERY_APPLY = "dangerousgary.applyDamage"

  static QUERY_UPDATE_TARGET = "dangerousgary.updateDamageTarget"

  /**
   * Décrit un token ciblé : l'acteur, son image, son armure et les dégâts réels qu'il subit.
   * @param {Token} token Le token ciblé.
   * @param {number} total Le total du jet de dégâts.
   * @param {object} [options]
   * @param {boolean} [options.ignoreArmour] L'attaque ignore l'armure.
   * @param {object[]} [options.triggers] Les déclencheurs de l'attaque activés par le jet.
   * @returns {object|null} Les données de la cible enregistrées dans la carte, ou null sans acteur.
   */
  static getTargetInfo(token, total, { ignoreArmour = false, triggers = [] } = {}) {
    const actor = token?.actor
    if (!actor) return null
    const { armour, real, halved } = DamageCard.realDamage(actor, total, ignoreArmour)
    return {
      // Avec une sauvegarde, le déclencheur attend le jet de la cible ; sinon il est résolu à l'application des dégâts
      triggers: triggers.map((trigger) => ({ ...trigger, status: trigger.save ? "pending" : "info", amount: null })),
      uuid: actor.uuid,
      tokenUuid: token.document.uuid,
      name: token.document.name ?? actor.name,
      img: token.document.texture.src ?? actor.img,
      type: actor.type,
      armour,
      real,
      halved,
    }
  }

  /**
   * Les dégâts réellement subis par un acteur : divisés par deux (arrondi à l'inférieur) si sa défense le prévoit, puis armure déduite.
   * @param {Actor} actor La cible.
   * @param {number} total Le total du jet de dégâts.
   * @param {boolean} [ignoreArmour] L'attaque ignore l'armure.
   * @returns {{armour: number, real: number, halved: boolean}}
   */
  static realDamage(actor, total, ignoreArmour = false) {
    const halved = actor.system.damageReduction === "half"
    const armour = ignoreArmour ? 0 : actor.armour
    return { armour, halved, real: Math.max(0, (halved ? Math.floor(total / 2) : total) - armour) }
  }

  /**
   * Ce que les défenses des cibles imposent au jet de dégâts d'un attaquant : le type d'attaque (attaques contraintes ou exaltées
   * contre la cible, aura de terreur pour un donjexeur de niveau insuffisant) et le lancer de deux dés en gardant le plus bas.
   * Avec plusieurs cibles, une contrainte ne s'applique que si toutes l'imposent : sinon `mixed` le signale.
   * @param {Actor} attacker L'attaquant.
   * @param {Token[]} [tokens] Les tokens ciblés.
   * @returns {{attackType: "normal"|"constrained"|"exalted", keepLowest: boolean, mixed: boolean}}
   */
  static targetsDefence(attacker, tokens = Array.from(game.user.targets)) {
    const defences = tokens
      .map((token) => token.actor)
      .filter((actor) => actor?.isEncounter)
      .map((actor) => {
        let attackType = actor.system.attacksAgainst
        // Aura de terreur : un donjexeur de niveau insuffisant attaque en contrainte (une attaque exaltée redevient normale)
        if (attacker.isCharacter && actor.system.terror > 0 && attacker.system.level <= actor.system.terror) {
          attackType = attackType === "exalted" ? "normal" : "constrained"
        }
        return { attackType, keepLowest: actor.system.damageReduction === "lowest" }
      })
    const others = tokens.length - defences.length
    if (!defences.length) return { attackType: "normal", keepLowest: false, mixed: false }
    const sameType = defences.every((d) => d.attackType === defences[0].attackType) && (!others || defences[0].attackType === "normal")
    const sameLowest = defences.every((d) => d.keepLowest === defences[0].keepLowest) && (!others || !defences[0].keepLowest)
    return {
      attackType: sameType ? defences[0].attackType : "normal",
      keepLowest: sameLowest && defences[0].keepLowest,
      mixed: !sameType || !sameLowest,
    }
  }

  /**
   * Les cibles de l'utilisateur pour un jet de dégâts.
   * @param {number} total Le total du jet de dégâts.
   * @param {object} [options] Les options de getTargetInfo.
   * @returns {object[]}
   */
  static getTargets(total, options) {
    return Array.from(game.user.targets)
      .map((token) => DamageCard.getTargetInfo(token, total, options))
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
      Object.assign(target, DamageCard.realDamage(actor, message.system.total, message.system.ignoreArmour))
      Object.assign(target, await actor.applyDamage(target.real), { applied: true })
      // Déclencheurs sans sauvegarde : l'effet est subi aussitôt
      for (const trigger of target.triggers) {
        if (trigger.status !== "info" || trigger.effect === "none") continue
        trigger.amount = await DamageCard.applyTriggerEffect(actor, trigger, message.system.ignoreArmour)
        trigger.status = "applied"
      }
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
    await DamageCard.#updateTarget(message, index, { saveRolled: true })
  }

  /**
   * Applique l'effet d'un déclencheur à un acteur : dégâts supplémentaires (armure déduite) ou perte de points d'une caractéristique.
   * @param {Actor} actor La cible.
   * @param {object} trigger Le déclencheur.
   * @param {boolean} ignoreArmour L'attaque ignore l'armure.
   * @returns {Promise<number|null>} Les dégâts subis ou les points perdus, null sans effet chiffré.
   */
  static async applyTriggerEffect(actor, trigger, ignoreArmour) {
    if (trigger.effect === "none" || !trigger.formula) return null
    // Effet continu : il est posé sur la cible et sera proposé à chaque changement de round
    if (trigger.ongoing) {
      await actor.addOngoingEffect({ name: trigger.name, effect: trigger.effect, formula: trigger.formula, ignoreArmour, text: trigger.text })
      return null
    }
    return actor.applyEffect(trigger, { ignoreArmour })
  }

  /**
   * Décrit un déclencheur en une ligne : son texte, sa sauvegarde éventuelle et son effet, ou son résultat une fois résolu.
   * @param {object} trigger Le déclencheur d'une attaque ou d'une cible de carte.
   * @returns {string}
   */
  static describeTrigger(trigger) {
    const ability = (key) => game.i18n.localize(`DANGEROUSGARY.Labels.short.${key}`)
    const parts = []
    let effect = ""
    if (trigger.effect === "damage") effect = game.i18n.format("DANGEROUSGARY.Trigger.Summary.damage", { value: trigger.amount ?? trigger.formula })
    else if (trigger.effect === "heal") effect = game.i18n.format("DANGEROUSGARY.Trigger.Summary.heal", { value: trigger.amount ?? trigger.formula })
    else if (trigger.effect !== "none") effect = game.i18n.format("DANGEROUSGARY.Trigger.Summary.ability", { value: trigger.amount ?? trigger.formula, ability: ability(trigger.effect) })
    if (effect && trigger.ongoing) effect = game.i18n.format("DANGEROUSGARY.Trigger.Summary.ongoing", { effect })
    if (trigger.status === "saved") parts.push(game.i18n.format("DANGEROUSGARY.Trigger.Summary.saved", { ability: ability(trigger.save) }))
    else if (trigger.save && trigger.status !== "applied") {
      parts.push(game.i18n.format(effect ? "DANGEROUSGARY.Trigger.Summary.saveOr" : "DANGEROUSGARY.Trigger.Summary.save", { ability: ability(trigger.save), effect }))
    } else if (effect) parts.push(effect)
    if (trigger.text && trigger.status !== "saved") parts.push(trigger.text)
    return parts.join(" · ")
  }

  /**
   * Lance la sauvegarde d'un déclencheur pour une cible : réussie, l'effet est évité ; ratée, il est appliqué.
   * @param {ChatMessage} message La carte de dégâts.
   * @param {number} index L'indice de la cible dans la carte.
   * @param {number} triggerIndex L'indice du déclencheur de la cible.
   * @returns {Promise<void>}
   */
  static async rollTriggerSave(message, index, triggerIndex) {
    const target = message.system.targets[index]
    const trigger = target?.triggers[triggerIndex]
    if (!trigger || !DangerousGaryDamageMessageData.canRollTriggerSave(target, trigger)) return
    const actor = await fromUuid(target.uuid)
    if (!actor) return
    const { success } = await actor.rollSave(trigger.save)
    const triggers = message.system.toObject().targets[index].triggers
    if (success) triggers[triggerIndex].status = "saved"
    else {
      triggers[triggerIndex].amount = await DamageCard.applyTriggerEffect(actor, trigger, message.system.ignoreArmour)
      triggers[triggerIndex].status = "applied"
    }
    await DamageCard.#updateTarget(message, index, { triggers })
  }

  /**
   * Met à jour une cible de la carte : directement si l'utilisateur peut modifier le message, sinon par le MJ actif.
   * @param {ChatMessage} message La carte de dégâts.
   * @param {number} index L'indice de la cible dans la carte.
   * @param {object} changes Les changements : saveRolled, triggers.
   * @returns {Promise<void>}
   */
  static async #updateTarget(message, index, changes) {
    if (message.canUserModify(game.user, "update")) {
      await DamageCard.#writeTarget(message, index, changes)
      return
    }
    await game.users.activeGM?.query(DamageCard.QUERY_UPDATE_TARGET, { messageId: message.id, index, changes })
  }

  /**
   * Écrit les changements d'une cible dans la carte.
   * @param {ChatMessage} message La carte de dégâts.
   * @param {number} index L'indice de la cible dans la carte.
   * @param {object} changes Les changements : saveRolled, triggers.
   * @returns {Promise<void>}
   */
  static async #writeTarget(message, index, { saveRolled, triggers }) {
    const targets = message.system.toObject().targets
    if (saveRolled !== undefined) targets[index].saveRolled = !!saveRolled
    if (Array.isArray(triggers)) targets[index].triggers = triggers
    await message.update({ "system.targets": targets })
  }

  /**
   * Requête "dangerousgary.updateDamageTarget" côté MJ : demandée par un joueur propriétaire de la cible, après une sauvegarde lancée depuis la carte.
   * @param {object} data
   * @param {string} data.messageId L'id de la carte.
   * @param {number} data.index L'indice de la cible dans la carte.
   * @param {object} data.changes Les changements : saveRolled, triggers.
   * @param {object} context
   * @param {User} context.user L'utilisateur qui a envoyé la requête.
   * @returns {Promise<boolean>} La carte a-t-elle été mise à jour.
   */
  static async _handleUpdateTargetQuery({ messageId, index, changes }, { user }) {
    const message = game.messages.get(messageId)
    if (message?.type !== "damage") return false
    const target = message.system.targets[index]
    const actor = target ? await fromUuid(target.uuid) : null
    if (!actor?.testUserPermission(user, "OWNER")) return false
    await DamageCard.#writeTarget(message, index, changes ?? {})
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
