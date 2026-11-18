import DangerousGaryActor from "./documents/actor.mjs"
import { DamageCard } from "./damage.mjs"

/**
 * Carte de début de round : elle liste les effets continus des combattants et les régénérations des rencontres,
 * que le MJ applique ou auxquels il met fin depuis la carte.
 */
export class RoundCard {
  /**
   * Les entrées d'un combat : un effet continu par ligne, plus la régénération des rencontres. Les combattants vaincus sont ignorés.
   * @param {Combat} combat Le combat.
   * @returns {object[]} Les entrées de la carte.
   */
  static getEntries(combat) {
    const entries = []
    for (const combatant of combat.combatants) {
      const actor = combatant.actor
      if (!actor || combatant.isDefeated) continue
      const base = {
        uuid: actor.uuid,
        tokenUuid: combatant.token?.uuid ?? "",
        name: combatant.name,
        img: combatant.token?.texture.src ?? actor.img,
        type: actor.type,
      }
      for (const effect of actor.ongoingEffects) {
        const ongoing = effect.getFlag("dangerousgary", "ongoing")
        entries.push({ ...base, effectId: effect.id, label: effect.name, effect: ongoing.effect, formula: ongoing.formula, ignoreArmour: !!ongoing.ignoreArmour })
      }
      if (actor.isEncounter && actor.system.regeneration && actor.system.hp.value < actor.system.hp.max) {
        entries.push({ ...base, effectId: "", label: game.i18n.localize("DANGEROUSGARY.Ongoing.Regeneration"), effect: "heal", formula: actor.system.regeneration })
      }
    }
    return entries
  }

  /**
   * Crée la carte du round qui commence, s'il y a quelque chose à traiter.
   * @param {Combat} combat Le combat.
   * @returns {Promise<ChatMessage|null>}
   */
  static async create(combat) {
    const entries = RoundCard.getEntries(combat)
    if (!entries.length) return null
    return ChatMessage.implementation.create({
      type: "round",
      content: game.i18n.format("DANGEROUSGARY.Ongoing.RoundTitle", { round: combat.round }),
      speaker: { alias: game.i18n.localize("DANGEROUSGARY.Ongoing.Title") },
      system: { round: combat.round, entries },
    })
  }

  /**
   * Applique l'effet d'une entrée à son acteur (MJ seulement) et note le résultat sur la carte.
   * @param {ChatMessage} message La carte de round.
   * @param {number} index L'indice de l'entrée.
   * @returns {Promise<void>}
   */
  static async apply(message, index) {
    const entries = message.system.toObject().entries
    const entry = entries[index]
    if (!game.user.isGM || entry?.status !== "pending") return
    const actor = await fromUuid(entry.uuid)
    if (!actor) return ui.notifications.warn(game.i18n.format("DANGEROUSGARY.Damage.TargetNotFound", { name: entry.name }))
    const strBefore = actor.system.abilities?.str.value
    entry.amount = await actor.applyEffect(entry, { ignoreArmour: entry.ignoreArmour })
    entry.status = "applied"
    const strAfter = actor.system.abilities?.str.value
    if (entry.effect === "damage" && strAfter > 0 && strAfter < strBefore) entry.strSave = "pending"
    await message.update({ "system.entries": entries })
  }

  /**
   * Lance la sauvegarde de Force contre le choc d'une entrée dont les dégâts ont entamé la Force (MJ seulement).
   * @param {ChatMessage} message La carte de round.
   * @param {number} index L'indice de l'entrée.
   * @returns {Promise<void>}
   */
  static async rollShockSave(message, index) {
    const entries = message.system.toObject().entries
    const entry = entries[index]
    if (!game.user.isGM || entry?.strSave !== "pending") return
    const actor = await fromUuid(entry.uuid)
    if (!actor) return
    const result = await actor.rollShockSave()
    entry.strSave = result?.success ? "success" : "failure"
    await message.update({ "system.entries": entries })
  }

  /**
   * Met fin à l'effet continu d'une entrée (MJ seulement) : il est retiré de l'acteur et ne sera plus proposé.
   * @param {ChatMessage} message La carte de round.
   * @param {number} index L'indice de l'entrée.
   * @returns {Promise<void>}
   */
  static async end(message, index) {
    const entries = message.system.toObject().entries
    const entry = entries[index]
    if (!game.user.isGM || !entry?.effectId || entry.status === "ended") return
    const actor = await fromUuid(entry.uuid)
    await actor?.effects.get(entry.effectId)?.delete()
    // Un effet déjà appliqué ce round garde son résultat sur la carte
    if (entry.status === "pending") entry.status = "ended"
    entry.effectId = ""
    await message.update({ "system.entries": entries })
  }

  /**
   * Le contexte de rendu de la carte : un joueur ne voit que les entrées des personnages.
   * @param {ChatMessage} message La carte de round.
   * @returns {object}
   */
  static prepareContext(message) {
    const isGM = game.user.isGM
    return {
      title: game.i18n.format("DANGEROUSGARY.Ongoing.RoundTitle", { round: message.system.round }),
      isGM,
      entries: message.system.entries
        .map((entry, index) => ({
          ...entry,
          index,
          summary: DamageCard.describeTrigger({ effect: entry.effect, formula: entry.formula, amount: entry.amount, status: entry.status }),
          isPending: entry.status === "pending",
          isEnded: entry.status === "ended",
          canEnd: isGM && !!entry.effectId,
          canRollShockSave: isGM && entry.strSave === "pending",
          shockResult: ["success", "failure"].includes(entry.strSave) ? DangerousGaryActor.shockResultText(entry.name, entry.strSave === "success") : "",
        }))
        .filter((entry) => isGM || entry.type === "character"),
    }
  }
}
