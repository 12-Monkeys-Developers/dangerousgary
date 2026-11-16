import DangerousGaryBaseItemSheet from "./base-item-sheet.mjs"

export default class DangerousGaryAttackSheet extends DangerousGaryBaseItemSheet {


  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dangerousgary", "item", "attack"],
    position: {
      width: 460,
      height: 620
    },
    form: {
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      editImage: DangerousGaryAttackSheet.#onEditImage,
      addTrigger: DangerousGaryAttackSheet.#onAddTrigger,
      removeTrigger: DangerousGaryAttackSheet.#onRemoveTrigger
    }
  };

  /** @override */
  static PARTS = {
    main: {
      template: "systems/dangerousgary/templates/attack-main.hbs"
    }
  }

  /** @override */
  async _prepareContext() {
    const context = {
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      item: this.document,
      system: this.document.system,
      source: this.document.toObject(),
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description, { async: true }),
      locked: this.isPlayMode,
      triggers: Object.entries(this.document.system.triggers).map(([key, trigger]) => ({ key, ...trigger })),
      triggerFields: this.document.system.schema.fields.triggers.element.fields,
    }
    return context;
  }

  /** Ajoute un déclencheur vide à l'attaque. */
  static async #onAddTrigger() {
    await this.document.update({ [`system.triggers.${foundry.utils.randomID()}`]: {} })
  }

  /**
   * Retire un déclencheur de l'attaque.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Le bouton, qui porte la clé du déclencheur.
   */
  static async #onRemoveTrigger(event, target) {
    await this.document.update({ [`system.triggers.-=${target.dataset.key}`]: null })
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