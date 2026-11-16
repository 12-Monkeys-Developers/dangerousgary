import DangerousGaryBaseActorSheet from "./base-actor-sheet.mjs"
import { DamageCard } from "../../damage.mjs"

const { ux } = foundry.applications
const { DragDrop } = foundry.applications.ux

export default class DangerousGaryEncounterSheet extends DangerousGaryBaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dangerousgary", "actor", "encounter"],
    position: {
      width: 870,
      height: 570,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      resizable: true,
    },
    actions: {
      edit: DangerousGaryEncounterSheet.#onItemEdit,
      delete: DangerousGaryEncounterSheet.#onItemDelete,
      rollSave: DangerousGaryEncounterSheet.#onItemRollSave,
      rollDamage: DangerousGaryEncounterSheet.#onAttackRollDamage,
      editImage: DangerousGaryEncounterSheet.#onEditImage,
      createItem: DangerousGaryEncounterSheet.#onCreateItem,
    },
  }

  /** @override */
  static PARTS = {
    main: {
      template: "systems/dangerousgary/templates/encounter-main.hbs",
    },
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    Object.assign(context, {
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      actor: this.document,
      system: this.document.system,
      source: this.document.toObject(),
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description, { async: true }),
      enrichedPowers: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.powers, { async: true }),
      locked: this.isPlayMode,
    })

    const attacks = []
    const attacksRaw = this.actor.itemTypes.attack
    for (const item of attacksRaw) {
      item.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, { async: true })
      item.tooltip = `${item.enrichedDescription}${DangerousGaryEncounterSheet.#specialEffectsSummary(item)}`
      attacks.push(item)
    }

    Object.assign(context, {
      attacks,
    })

    return context
  }

  /**
   * Résumé des options et des effets spéciaux d'une attaque, ajouté à son infobulle sous la description.
   * @param {Item} item L'attaque.
   * @returns {string} Une liste HTML, vide sans option ni effet spécial.
   */
  static #specialEffectsSummary(item) {
    const escape = foundry.utils.escapeHTML
    const lines = []
    if (item.system.criticalDamage) lines.push(`<li>${game.i18n.localize("DANGEROUSGARY.Attack.FIELDS.criticalDamage.label")}</li>`)
    if (item.system.ignoreArmour) lines.push(`<li>${game.i18n.localize("DANGEROUSGARY.Attack.FIELDS.ignoreArmour.label")}</li>`)
    for (const trigger of Object.values(item.system.triggers)) {
      const { min, max } = trigger
      let range = game.i18n.localize("DANGEROUSGARY.Trigger.EveryHit")
      if (min !== null || max !== null) {
        const from = min ?? max
        const to = max ?? min
        range = game.i18n.format("DANGEROUSGARY.Trigger.OnDie", { range: from === to ? `${from}` : `${from}-${to}` })
      }
      const summary = DamageCard.describeTrigger(trigger)
      lines.push(`<li><strong>${escape(trigger.name)}</strong> (${range})${summary ? ` : ${escape(summary)}` : ""}</li>`)
    }
    return lines.length ? `<ul class="dg-tooltip-list">${lines.join("")}</ul>` : ""
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)
    new DragDrop.implementation({
      dragSelector: ".draggable",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element)
  }

  //#region Drag-and-Drop Workflow

  _canDragStart(selector) {
    return this.isEditable
  }

  /**
   * Début du glisser d'une attaque : vers la barre de macros, elle crée une macro de jet de dégâts.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const el = event.currentTarget.closest(".draggable")
    if (el?.dataset.dragType !== "rollAttack" || !el.dataset.itemId) return
    const dragData = {
      type: "rollAttack",
      // Acteur du token pour un token non lié : la macro retrouve ainsi la Rencontre d'origine
      actorUuid: this.actor.uuid,
      itemId: el.dataset.itemId,
    }
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    return this.isEditable
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = ux.TextEditor.implementation.getDragEventData(event)

    // Handle different data types
    switch (data.type) {
      case "Item":
        const item = await fromUuid(data.uuid)
        if (item.type !== "attack") return
        return await this.actor.createEmbeddedDocuments("Item", [item], { renderSheet: false })
    }
  }

  //#endregion

  //#region Actions

  static #onItemEdit(event, target) {
    const itemId = target.getAttribute("data-item-id")
    const item = this.actor.items.get(itemId)
    item.sheet.render(true)
  }

  static async #onItemDelete(event, target) {
    const itemId = target.getAttribute("data-item-id")
    const item = this.actor.items.get(itemId)
    item.delete()
  }

  static async #onItemRollSave(event, target) {
    const ability = target.getAttribute("data-ability")
    const roll = await this.actor.rollSave(ability)
  }

  static async #onAttackRollDamage(event, target) {
    const itemName = target.getAttribute("data-name")
    const formula = target.getAttribute("data-formula")
    // L'attaque porte le dé explosif, l'armure ignorée et les déclencheurs
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId)
    const options = { item, criticalDamage: !!item?.system.criticalDamage }
    if (event.shiftKey) {
      await this.actor.promptDamageRoll(itemName, formula, options)
    } else {
      await this.actor.rollDamage(itemName, formula, options)
    }
  }

  static async #onEditImage(event, target) {
    const attr = target.dataset.edit
    const current = foundry.utils.getProperty(this.document, attr)
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {}
    const fp = new FilePicker({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path })
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return fp.browse()
  }

  static #onCreateItem(event, target) {
    event.preventDefault()
    const type = target.dataset.type

    const itemData = {
      type: type,
      system: foundry.utils.expandObject({ ...target.dataset }),
    }
    delete itemData.system.type

    switch (type) {
      case "attack":
        itemData.name = game.i18n.localize("DANGEROUSGARY.NewAttack")
        break
    }

    return this.actor.createEmbeddedDocuments("Item", [itemData])
  }

  //#endregion
}
