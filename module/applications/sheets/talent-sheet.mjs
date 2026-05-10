import DangerousGaryBaseItemSheet from "./base-item-sheet.mjs"

export default class DangerousGaryTalentSheet extends DangerousGaryBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dangerousgary", "item", "talent"],
    position: {
      width: 350,
      height: 500,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      resizable: true,
    },
    actions: {
      editImage: DangerousGaryTalentSheet.#onEditImage,
    },
  }

  /** @override */
  static PARTS = {
    main: {
      template: "systems/dangerousgary/templates/talent-main.hbs",
    },
  }

  /** @override */
  async _prepareContext() {
    const choices = this.document.system.schema.fields.talentClass.choices
    const sorted = Object.entries(choices)
      .map(([key, label]) => [key, game.i18n.localize(label)])
      .sort((a, b) => a[1].localeCompare(b[1]))
    const talentClassChoices = Object.fromEntries(sorted)
    const context = {
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      item: this.document,
      system: this.document.system,
      source: this.document.toObject(),
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description, { async: true }),
      talentClassChoices,
      locked: this.isPlayMode,
    }
    return context
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
}
