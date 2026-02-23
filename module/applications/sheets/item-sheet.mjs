import DangerousGaryItemData from "../../models/item.mjs"

const { HandlebarsApplicationMixin } = foundry.applications.api

export default class DangerousGaryItemSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {


  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dangerousgary", "item", "equipment"],
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
      editImage: DangerousGaryItemSheet.#onEditImage
    }
  };

  /** @override */
  static PARTS = {
    main: {
      template: "systems/dangerousgary/templates/equipment-main.hbs"
    }
  }

  /** @override */
  async _prepareContext() {
    const subTypeField = this.document.system.schema.fields.subType
    const enableClasses = game.settings.get("dangerousgary", "enableClasses")
    const subTypeChoices = Object.fromEntries(
      Object.entries(subTypeField.choices).filter(([key]) => enableClasses || key !== "artefact")
    )

    const context = {
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      item: this.document,
      system: this.document.system,
      source: this.document.toObject(),
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description, { async: true }),
      subTypeChoices,
    }
    return context;
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)
    this._weaponCategoryListener()
  }

  _weaponCategoryListener() {
    const selector = this.element.querySelector('select[name="system.weaponCategory"]')
    if (selector) {
      selector.addEventListener("change", this._onChangeWeaponCategory.bind(this))
    }
  }

  async _onChangeWeaponCategory(event) {
    event.preventDefault()
    if (!this.isEditable) return
    const newCategory = event.target.value
    const defaults = DangerousGaryItemData.WEAPON_DEFAULTS[newCategory]
    if (defaults) {
      await this.document.update({
        system: {
          damageFormula: defaults.damageFormula,
          criticalDamage: defaults.criticalDamage,
        },
      })
    }
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