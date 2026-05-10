import DangerousGaryBaseItemSheet from "./base-item-sheet.mjs"

export default class DangerousGaryArtefactSheet extends DangerousGaryBaseItemSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dangerousgary", "item", "artefact"],
    position: {
      width: 350,
      height: 550
    },
    form: {
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      editImage: DangerousGaryArtefactSheet.#onEditImage,
      addCapacity: DangerousGaryArtefactSheet.#onAddCapacity,
      removeCapacity: DangerousGaryArtefactSheet.#onRemoveCapacity,
    }
  };

  /** @override */
  static PARTS = {
    main: {
      template: "systems/dangerousgary/templates/artefact-main.hbs"
    }
  }

  /** @override */
  async _prepareContext() {
    const capacities = this.document.system.artefactCapacities
    const enrichedCapacities = []
    for (const [key, cap] of Object.entries(capacities)) {
      enrichedCapacities.push({
        key,
        level: cap.level,
        description: cap.description,
        enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(cap.description, { async: true }),
      })
    }
    return {
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      item: this.document,
      system: this.document.system,
      source: this.document.toObject(),
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description, { async: true }),
      enrichedCapacities,
      canAddCapacity: Object.keys(capacities).length < 3 && Object.keys(capacities).length + this.document.system.allowedClasses.size < 4,
      capacityLevelField: this.document.system.schema.fields.artefactCapacities.element.fields.level,
      capacityDescField: this.document.system.schema.fields.artefactCapacities.element.fields.description,
      locked: this.isPlayMode,
    }
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)
    this._artefactClassesListener()
  }

  _artefactClassesListener() {
    const container = this.element.querySelector("multi-checkbox[name='system.allowedClasses']")
    if (!container) return

    if (this.isPlayMode) {
      const checkboxes = container.querySelectorAll("input[type='checkbox']")
      for (const cb of checkboxes) cb.disabled = true
      return
    }

    const capacityCount = Object.keys(this.document.system.artefactCapacities).length
    const maxClasses = Math.min(3, 4 - capacityCount)

    const updateState = () => {
      const checkboxes = container.querySelectorAll("input[type='checkbox']")
      const checkedCount = [...checkboxes].filter(cb => cb.checked).length
      for (const cb of checkboxes) {
        if (!cb.checked) cb.disabled = checkedCount >= maxClasses
      }
    }

    container.addEventListener("change", updateState)
    updateState()
  }

  static async #onAddCapacity(event, target) {
    const existingKeys = Object.keys(this.document.system.artefactCapacities)
    if (existingKeys.length >= 3) return
    if (existingKeys.length + this.document.system.allowedClasses.size >= 4) return
    const key = ["1", "2", "3"].find(k => !existingKeys.includes(k))
    if (!key) return
    await this.document.update({ [`system.artefactCapacities.${key}`]: { level: 1, description: "" } })
  }

  static async #onRemoveCapacity(event, target) {
    const key = target.dataset.key
    await this.document.update({ [`system.artefactCapacities.-=${key}`]: null })
  }

  static async #onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new FilePicker({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }
}
