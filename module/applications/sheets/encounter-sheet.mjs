const { sheets, ux } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api
const { DragDrop } = foundry.applications.ux

export default class DangerousGaryEncounterSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dangerousgary", "actor", "encounter"],
    position: {
      width: 870,
      height: 400,
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
    })

    const attacks = []
    const attacksRaw = this.actor.itemTypes.attack
    for (const item of attacksRaw) {
      item.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, { async: true })
      attacks.push(item)
    }

    Object.assign(context, {
      attacks,
    })

    return context
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

  _canDragDrop(selector) {
    return this.isEditable
  }

  _onDragStart(event) {
    const el = event.currentTarget
    if ("link" in event.target.dataset) return

    let dragData = null

    if (!dragData) return

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
  }

  _onDragOver(event) {}

  async _onDrop(event) {
    const data = ux.TextEditor.implementation.getDragEventData(event)
    const item = this.item
    const allowed = Hooks.call("dropItemSheetData", item, this, data)
    if (allowed === false) return

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
    if (item.system.quantity > 1) {
      await item.update({ "system.quantity": item.system.quantity - 1 })
    } else {
      item.delete()
    }
  }

  static async #onItemRollSave(event, target) {
    const ability = target.getAttribute("data-ability")
    const roll = await this.actor.rollSave(ability)
  }

  static async #onAttackRollDamage(event, target) {
    const itemName = target.getAttribute("data-name")
    const formula = target.getAttribute("data-formula")
    const roll = await this.actor.rollDamage(itemName, formula)
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
