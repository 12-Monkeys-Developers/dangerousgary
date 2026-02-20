export default class DangerousGaryItemData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      subType: new fields.StringField({
        required: true,
        nullable: false,
        initial: "weapon",
        choices: {
          equipment: { label: "DANGEROUSGARY.Equipment.SubType.equipment" },
          armour: { label: "DANGEROUSGARY.Equipment.SubType.armour" },
          weapon: { label: "DANGEROUSGARY.Equipment.SubType.weapon" },
        },
      }),
      description: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
      armour: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      quantity: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      damageFormula: new fields.StringField({ required: false, nullable: true }),
      equipped: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      bulky: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    }
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["DANGEROUSGARY.Equipment"]

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    let updates = {}
    const stats = this.parent._stats

    // Pour un item non dupliqué, non provenant d'un compendium et non exporté
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource) {
      // Image par défaut
      if (!foundry.utils.hasProperty(data, "img")) {
        updates.img = "icons/svg/item-bag.svg"
      }
    }
    this.parent.updateSource(updates)
  }

  get isArmor() {
    return this.subType === "armour"
  }

  get isWeapon() {
    return this.subType === "weapon"
  }

  get isEquipped() {
    return this.equipped
  }

  get isBulky() {
    return this.bulky
  }

  get hasQuantity() {
    return this.quantity > 1
  }

  get hasDamage() {
    return !!this.damageFormula
  }
}
