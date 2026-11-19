import { CLASS_ABILITIES, canManageAssassin, denyAssassin, isAssassinTalent, visibleAssassinHtml } from "../../assassin.mjs"
import DangerousGaryChat from "../../chat.mjs"
import DangerousGaryBaseActorSheet from "./base-actor-sheet.mjs"

const { ux } = foundry.applications
const { DragDrop } = foundry.applications.ux

export default class DangerousGaryCharacterSheet extends DangerousGaryBaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dangerousgary", "actor", "character"],
    position: {
      width: 900,
      height: 800,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      resizable: true,
    },
    actions: {
      edit: DangerousGaryCharacterSheet.#onItemEdit,
      delete: DangerousGaryCharacterSheet.#onItemDelete,
      rollSave: DangerousGaryCharacterSheet.#onItemRollSave,
      rollDamage: DangerousGaryCharacterSheet.#onItemRollDamage,
      rest: DangerousGaryCharacterSheet.#onRest,
      equip: DangerousGaryCharacterSheet.#onItemEquip,
      unequip: DangerousGaryCharacterSheet.#onItemUnequip,
      editImage: DangerousGaryCharacterSheet.#onEditImage,
      createItem: DangerousGaryCharacterSheet.#onCreateItem,
      rollClassSave: DangerousGaryCharacterSheet.#onRollClassSave,
      toggleOsmose: DangerousGaryCharacterSheet.#onToggleOsmose,
      rollOsmose: DangerousGaryCharacterSheet.#onRollOsmose,
      useArtefact: DangerousGaryCharacterSheet.#onUseArtefact,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: "systems/dangerousgary/templates/character-header.hbs" },
    main: { template: "systems/dangerousgary/templates/character-main.hbs" },
    tabs: { template: "systems/dangerousgary/templates/tab-navigation.hbs" },
    biography: { template: "systems/dangerousgary/templates/character-biography.hbs" },
    inventory: { template: "systems/dangerousgary/templates/character-inventory.hbs" },
    classes: { template: "systems/dangerousgary/templates/character-classes.hbs" },
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "biography" }, { id: "inventory" }, { id: "classes" }],
      initial: "inventory",
      labelPrefix: "DANGEROUSGARY.Labels.long",
    },
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    const enableClasses = game.settings.get("dangerousgary", "enableClasses") || game.user.isGM
    Object.assign(context, {
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      actor: this.document,
      system: this.document.system,
      source: this.document.toObject(),
      enableClasses,
      locked: this.isPlayMode,
      // Icônes de repos de l'en-tête : clic pour se reposer, glisser vers la barre de macros
      rests: Object.entries(this.document.system.constructor.RESTS).map(([key, rest]) => ({
        key,
        icon: rest.icon,
        tooltip: `<strong>${game.i18n.localize(rest.label)}</strong><br>${game.i18n.localize(`DANGEROUSGARY.Rest.Hint.${key}`)}<br><em>${game.i18n.localize("DANGEROUSGARY.Rest.Drag")}</em>`,
      })),
    })
    context.canManageAssassin = canManageAssassin(this.actor)
    context.assassinSave = context.canManageAssassin ? this.actor.getClassSaveValue("assassin") : null
    if (!game.user.isGM) {
      context.system = this.document.system.toObject()
      delete context.system.classes.assassin
      context.system.perk = visibleAssassinHtml(context.system.perk)
      context.system.biography = visibleAssassinHtml(context.system.biography)
      context.system.equipmentMisc = visibleAssassinHtml(context.system.equipmentMisc)
      if (/Assassin/.test(context.system.perkName)) context.system.perkName = ""
      context.source.system = context.system
    }
    return context
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options)

    switch (partId) {
      case "tabs":
        if (!context.enableClasses) {
          delete context.tabs.classes
        }
        break
      case "main":
        context.enrichedPerk = await foundry.applications.ux.TextEditor.implementation.enrichHTML(visibleAssassinHtml(this.document.system.perk), { async: true })
        break
      case "biography":
        context.tab = context.tabs.biography
        context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(visibleAssassinHtml(this.document.system.biography), { async: true })
        break
      case "inventory":
        context.tab = context.tabs.inventory
        context.items = []
        context.artefacts = []
        for (const item of this.actor.itemTypes.equipment) {
          item.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(visibleAssassinHtml(item.system.description), { async: true })
          context.items.push(item)
        }
        if (context.enableClasses) {
          for (const item of this.actor.itemTypes.artefact ?? []) {
            item.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(visibleAssassinHtml(item.system.description), { async: true })
            const bestClassLevel = item.system.bestClassLevel(this.document)
            const allowedClassLabels = item.system.visibleClasses().map((key) => game.i18n.localize(`DANGEROUSGARY.Talent.Classes.${key}`))
            const capacities = []
            for (const [key, cap] of item.system.visibleCapacities()) {
              capacities.push({
                key,
                level: cap.level,
                description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(visibleAssassinHtml(cap.description), { async: true }),
                unlocked: bestClassLevel >= cap.level,
              })
            }
            // Infobulle : la description, puis les capacités visibles avec leur niveau requis
            const levelLabel = game.i18n.localize("DANGEROUSGARY.Artefact.LevelAbbr")
            const capacityLines = capacities.map((cap) => `<li><strong>${levelLabel} ${cap.level}</strong> ${cap.description}</li>`).join("")
            const tooltip = `${item.enrichedDescription}${capacityLines ? `<ul class="dg-artefact-tooltip-capacities">${capacityLines}</ul>` : ""}`
            item.artefactData = { bestClassLevel, allowedClassLabels, capacities, tooltip, canUse: bestClassLevel >= 1 }
            context.artefacts.push(item)
          }
        }
        context.enrichedMiscEquipment = await foundry.applications.ux.TextEditor.implementation.enrichHTML(visibleAssassinHtml(this.document.system.equipmentMisc), { async: true })
        break
      case "classes":
        context.tab = context.tabs.classes
        const classKeys = [...Object.keys(CLASS_ABILITIES), ...(context.canManageAssassin ? ["assassin"] : [])]
        context.talentsByClass = {}
        for (const key of classKeys) context.talentsByClass[key] = []
        const talentsRaw = this.actor.itemTypes.talent ?? []
        for (const talent of talentsRaw) {
          if (isAssassinTalent(talent) && !context.canManageAssassin) continue
          talent.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(talent.system.description, { async: true })
          const classKey = talent.system.talentClass
          if (classKey && context.talentsByClass[classKey]) {
            context.talentsByClass[classKey].push(talent)
          }
        }
        for (const key of classKeys) {
          context.talentsByClass[key].sort((a, b) => a.system.level - b.system.level)
        }
        break
    }
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

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    return this.isEditable
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
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const el = event.currentTarget.closest(".draggable")
    if (!el) return
    const dragType = el.dataset.dragType
    if (!dragType) return

    let dragData = null
    switch (dragType) {
      case "rollDamage":
        const itemId = el.dataset.itemId
        if (!itemId) return
        dragData = {
          type: "rollDamage",
          actorId: this.document.id,
          itemId,
        }
        break
      case "rest":
        dragData = { type: "rest", actorUuid: this.document.uuid, rest: el.dataset.rest }
        break
      case "rollSave":
        dragData = {
          type: "rollSave",
          actorId: this.document.id,
          ability: el.dataset.ability,
        }
        break
      case "rollClassSave":
        const ability = DangerousGaryCharacterSheet.CLASS_ABILITY[el.dataset.talentClass]
        if (el.dataset.talentClass === "assassin" ? !canManageAssassin(this.actor) : !ability) return
        dragData = {
          type: "rollClassSave",
          actorId: this.document.id,
          actorUuid: this.document.uuid,
          itemId: el.dataset.itemId,
          talentClass: el.dataset.talentClass,
          ability,
        }
        break
    }

    if (!dragData) return
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
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
        if (item.type !== "equipment" && item.type !== "talent" && item.type !== "artefact") return
        if (isAssassinTalent(item) && !canManageAssassin(this.actor)) return denyAssassin()
        if (item.type === "talent") {
          // Un talent ne s'ajoute qu'en mode Écriture
          if (!this.isEditMode) {
            ui.notifications.warn("DANGEROUSGARY.Warnings.TalentDropEditMode", { localize: true })
            return
          }
          const duplicate = this.actor.itemTypes.talent.find(t => t.name === item.name)
          if (duplicate) {
            ui.notifications.warn(game.i18n.format("DANGEROUSGARY.Warnings.DuplicateTalent", { name: item.name }))
            return
          }
          // Un talent de niveau X demande d'avoir déjà un talent de chaque niveau de 1 à X-1 dans la même classe
          const { level, talentClass } = item.system
          if (talentClass && level > 1) {
            const owned = new Set(this.actor.itemTypes.talent.filter((t) => t.system.talentClass === talentClass).map((t) => t.system.level))
            const missing = Array.from({ length: level - 1 }, (_, i) => i + 1).filter((l) => !owned.has(l))
            if (missing.length) {
              ui.notifications.warn(
                game.i18n.format("DANGEROUSGARY.Warnings.TalentLowerLevels", {
                  name: item.name,
                  level,
                  className: game.i18n.localize(`DANGEROUSGARY.Talent.Classes.${talentClass}`),
                }),
              )
              return
            }
          }
        }
        await this.actor.createEmbeddedDocuments("Item", [item], { renderSheet: false })
        if (item.type === "talent" && item.system.talentClass) {
          await this._updateClassLevel(item.system.talentClass)
        }
        return
    }
  }

  //#endregion

  //#region Actions
  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
   */
  static #onItemEdit(event, target) {
    const itemId = target.getAttribute("data-item-id")
    const item = this.actor.items.get(itemId)
    item.sheet.render(true)
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
   */
  static async #onItemDelete(event, target) {
    const itemId = target.getAttribute("data-item-id")
    const item = this.actor.items.get(itemId)
    const talentClass = item.type === "talent" ? item.system.talentClass : null
    await item.delete()
    if (talentClass) {
      await this._updateClassLevel(talentClass)
    }
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
   */
  static async #onItemRollSave(event, target) {
    const ability = target.getAttribute("data-ability")
    await this.actor.rollSave(ability, { useMax: event.shiftKey })
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
   */
  static async #onItemRollDamage(event, target) {
    const itemName = target.getAttribute("data-name")
    const formula = target.getAttribute("data-formula")
    const criticalDamage = target.getAttribute("data-critical-damage") === "true"
    if (event.shiftKey) {
      await this.actor.promptDamageRoll(itemName, formula, { criticalDamage })
    } else {
      await this.actor.rollDamage(itemName, formula, { criticalDamage })
    }
  }

  /**
   * Clic sur une icône de repos de l'en-tête.
   * @param {PointerEvent} event
   * @param {HTMLElement} target L'icône, qui porte le type de repos.
   */
  static async #onRest(event, target) {
    await this.actor.system.rest(target.dataset.rest)
  }

  static async #onItemEquip(event, target) {
    const itemId = target.getAttribute("data-item-id")
    const item = this.actor.items.get(itemId)
    await item.update({ "system.equipped": true })
  }

  static async #onItemUnequip(event, target) {
    const itemId = target.getAttribute("data-item-id")
    const item = this.actor.items.get(itemId)
    await item.update({ "system.equipped": false })
  }

  /**
   * Handle changing a Document's image.
   *
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @private
   */
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
      case "equipment":
        itemData.name = game.i18n.localize("DANGEROUSGARY.NewEquipment")
        break
      case "talent":
        itemData.name = game.i18n.localize("DANGEROUSGARY.NewTalent")
        break
      case "artefact":
        itemData.name = game.i18n.localize("DANGEROUSGARY.NewArtefact")
        break
    }

    return this.actor.createEmbeddedDocuments("Item", [itemData])
  }

  async _updateClassLevel(classKey) {
    if (classKey === "assassin" && !canManageAssassin(this.actor)) return denyAssassin()
    const count = this.actor.itemTypes.talent.filter(t => t.system.talentClass === classKey).length
    await this.actor.update({ [`system.classes.${classKey}`]: count })
  }

  static CLASS_ABILITY = CLASS_ABILITIES

  /** Clic sur le mot Osmose : sauvegarde d'Osmose. */
  static async #onRollOsmose() {
    await this.actor.rollOsmose()
  }

  static async #onToggleOsmose(event, target) {
    const clicked = Number(target.dataset.value)
    const current = this.actor.system.osmose
    const newValue = clicked === current ? current - 1 : clicked
    await this.actor.update({ "system.osmose": newValue })
  }

  static async #onUseArtefact(event, target) {
    const itemId = target.dataset.itemId
    const capacityKey = target.dataset.capacityKey
    const item = this.actor.items.get(itemId)
    if (!item) return
    const capacity = item.system.artefactCapacities[capacityKey]
    if (!capacity || !item.system.visibleCapacities().some(([key]) => key === capacityKey)) return
    const enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(capacity.description, { async: true })
    const chatData = {
      itemName: item.name,
      itemImg: item.img,
      capacityLevel: capacity.level,
      capacityDescription: enrichedDescription,
    }
    const chat = await new DangerousGaryChat(this.actor)
      .withTemplate("systems/dangerousgary/templates/artefact-use.hbs")
      .withData(chatData)
      .create()
    const assassinUse = item.system.allowedClasses.has("assassin") && item.system.bestClassLevel(this.actor, { isGM: false }) < capacity.level
    if (chat) await chat.display(assassinUse ? { messageMode: "gm" } : {})
  }

  static async #onRollClassSave(event, target) {
    const talentClass = target.dataset.talentClass
    await this.actor.rollClassSave(talentClass, { talentId: target.dataset.itemId ?? null })
  }

  //#endregion
}
