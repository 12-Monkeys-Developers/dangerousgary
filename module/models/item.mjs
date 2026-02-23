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
          artefact: { label: "DANGEROUSGARY.Equipment.SubType.artefact" },
        },
      }),
      weaponCategory: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
        choices: {
          melee: "DANGEROUSGARY.Equipment.WeaponCategory.melee",
          meleeWeapons: "DANGEROUSGARY.Equipment.WeaponCategory.meleeWeapons",
          rangedWeapons: "DANGEROUSGARY.Equipment.WeaponCategory.rangedWeapons",
          greatMeleeWeapons: "DANGEROUSGARY.Equipment.WeaponCategory.greatMeleeWeapons",
          handguns: "DANGEROUSGARY.Equipment.WeaponCategory.handguns",
          rifles: "DANGEROUSGARY.Equipment.WeaponCategory.rifles",
          warWeapons: "DANGEROUSGARY.Equipment.WeaponCategory.warWeapons",          
          other: "DANGEROUSGARY.Equipment.WeaponCategory.other",
        },
      }),
      description: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
      armour: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      damageFormula: new fields.StringField({ required: false, nullable: true }),
      equipped: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      bulky: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      criticalDamage: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    }
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["DANGEROUSGARY.Equipment"]

  static WEAPON_DEFAULTS = {
    melee: { damageFormula: "1d4", criticalDamage: false },
    meleeWeapons: { damageFormula: "1d6", criticalDamage: false },
    rangedWeapons: { damageFormula: "1d8", criticalDamage: false },
    greatMeleeWeapons: { damageFormula: "1d8", criticalDamage: false },
    handguns: { damageFormula: "1d8", criticalDamage: true },
    rifles: { damageFormula: "1d10", criticalDamage: true },
    warWeapons: { damageFormula: "1d12", criticalDamage: true },
  }

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

  get hasDamage() {
    return !!this.damageFormula
  }
}
