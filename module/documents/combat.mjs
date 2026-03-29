export default class DangerousGaryCombat extends foundry.documents.Combat {
  /** @override */
  async _onEnter(combatant) {
    await super._onEnter(combatant)
    combatant.update({ initiative: this.#getInitiative(combatant) })
  }

  // PJ : 200 + DEX (tri initial par dextérité), PNJ : 100 + aléatoire
  #getInitiative(combatant) {
    if (combatant.actor?.isEncounter) {
      return Math.ceil(100 + Math.random() * 100)
    } else {
      return 200 + (combatant.actor?.system.abilities.dex.value ?? 0)
    }
  }

  /** @override */
  _sortCombatants(a, b) {
    const hasActedA = a.getFlag("world", "hasActed")
    const hasActedB = b.getFlag("world", "hasActed")

    // Ceux qui n'ont pas joué passent en premier
    if (!hasActedA && hasActedB) return -1
    if (hasActedA && !hasActedB) return 1

    // À statut égal, tri par initiative décroissante (compatible drag-and-drop)
    return (b.initiative ?? 0) - (a.initiative ?? 0)
  }

  /** @override */
  async nextRound() {
    // Réinitialise hasActed et l'initiative de chaque combatant
    const updates = this.combatants.map((c) => ({
      _id: c.id,
      initiative: this.#getInitiative(c),
      "flags.world.hasActed": false,
    }))
    await this.updateEmbeddedDocuments("Combatant", updates)
    let turn = this.turn === null ? null : 0
    if (this.settings.skipDefeated && turn !== null) {
      turn = this.turns.findIndex((t) => !t.isDefeated)
      if (turn === -1) {
        ui.notifications.warn("COMBAT.NoneRemaining", { localize: true })
        turn = 0
      }
    }
    const advanceTime =
      Math.max(this.turns.length - (this.turn || 0), 0) * CONFIG.time.turnTime + CONFIG.time.roundTime
    return this.update({ round: this.round + 1, turn }, { advanceTime })
  }
}
