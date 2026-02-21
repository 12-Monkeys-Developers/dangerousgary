export default class DangerousGaryCombat extends foundry.documents.Combat {
  /** @override */
  async _onEnter(combatant) {
    await super._onEnter(combatant)
    combatant.update({ initiative: this.#getInitiative(combatant) })
  }

  // L'initiative est en 2xx pour les PJ (jouent en premier) et en 1xx pour les PNJ
  #getInitiative(combatant) {
    if (combatant.actor?.isEncounter) {
      return Math.ceil(100 + Math.random() * 100)
    } else {
      return Math.ceil(200 + Math.random() * 100)
    }
  }
}
