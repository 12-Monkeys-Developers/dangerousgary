const { ux, sidebar } = foundry.applications

export default class DangerousGaryCombatTracker extends sidebar.tabs.CombatTracker {
  static DEFAULT_OPTIONS = {
    actions: {
      combatantAct: DangerousGaryCombatTracker.#onCombatantAct,
    },
  }

  static PARTS = {
    header: {
      template: "templates/sidebar/tabs/combat/header.hbs",
    },
    tracker: {
      template: "systems/dangerousgary/templates/combat-tracker.hbs",
      scrollable: [""],
    },
    footer: {
      template: "templates/sidebar/tabs/combat/footer.hbs",
    },
  }

  /** @override */
  async _prepareTurnContext(combat, combatant, index) {
    const turn = await super._prepareTurnContext(combat, combatant, index)
    turn.hasActed = combatant.getFlag("world", "hasActed")
    return turn
  }

  static #onCombatantAct(...args) {
    return this._onAct(...args)
  }

  async _onAct(event, target) {
    event.preventDefault()
    const combat = this.viewed
    const combatant = combat.combatants.get(target.dataset.combatantId)
    await combatant.setFlag("world", "hasActed", !combatant.getFlag("world", "hasActed"))
  }

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    // Supprime les boutons de roll d'initiative (le template custom n'affiche déjà plus l'initiative)
    this.element.querySelector('.encounter-controls.combat .control-buttons.left [data-action="rollAll"]')?.remove()
    this.element.querySelector('.encounter-controls.combat .control-buttons.left [data-action="rollNPC"]')?.remove()

    new ux.DragDrop.implementation({
      dragSelector: ".combatant",
      dropSelector: ".combat-tracker",
      permissions: {
        dragstart: () => game.user.isGM,
        drop: () => game.user.isGM,
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element)
  }

  async _onDragStart(event) {
    const li = event.currentTarget
    const combatant = this.viewed.combatants.get(li.dataset.combatantId)
    if (!combatant) return
    const dragData = combatant.toDragData()
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
  }

  _onDragOver(event) {}

  async _onDrop(event) {
    event.stopPropagation()
    const data = ux.TextEditor.implementation.getDragEventData(event)
    const combatant = fromUuidSync(data.uuid)
    if (!combatant) return

    const targetCombatantLi = event.target.closest("li.combatant")
    const targetCombatantId = targetCombatantLi?.dataset.combatantId
    const targetCombatant = combatant.parent.combatants.get(targetCombatantId)
    if (!targetCombatant) return

    // Nouvelle initiative du combatant droppé = initiative du combattant cible
    const newInitiative = targetCombatant.initiative

    // Le combattant droppé avait une initiative inférieure à celle du combattant cible
    if (combatant.initiative < targetCombatant.initiative) {
      await targetCombatant.update({ initiative: targetCombatant.initiative - 10 })
    }
    // Le combattant droppé avait une initiative supérieure ou égale à celle du combattant cible
    else if (combatant.initiative >= targetCombatant.initiative) {
      await targetCombatant.update({ initiative: targetCombatant.initiative + 10 })
    }
    await combatant.update({ initiative: newInitiative })
  }
}
