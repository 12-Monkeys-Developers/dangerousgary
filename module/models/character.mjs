export default class DangerousGaryCharacterData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      biography: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
      hp: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
        max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
      }),
      xp: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      shortDescription: new fields.StringField({ required: false, blank: true, initial: "" }),
      equipmentPoints: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      perkName: new fields.StringField({ required: false, blank: true, initial: "" }),
      perk: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      specialties: new fields.SchemaField({
        first: new fields.StringField({ required: false, blank: true, initial: "" }),
        second: new fields.StringField({ required: false, blank: true, initial: "" }),
        third: new fields.StringField({ required: false, blank: true, initial: "" }),
      }),
      abilities: new fields.SchemaField({
        str: new fields.SchemaField({
          value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
          max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
        }),
        dex: new fields.SchemaField({
          value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
          max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
        }),
        wil: new fields.SchemaField({
          value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
          max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
        }),
      }),
    }
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["DANGEROUSGARY.Character"]

  /** @override */
  prepareBaseData() {
    this.armour = this.parent.items
      .filter((item) => item.system.subType === "armour" && item.system.equipped)
      .map((item) => item.system.armour)
      .reduce((acc, curr) => acc + curr, 0)
  }

  /**
   * A few minutes of rest and a swig of water recovers all of a character's lost hp.
   */
  shortRest() {
    return this.parent.update({ "system.hp.value": this.hp.max })
  }

  /**
   * Restore HP and recover ability points (capped at max).
   * @param {number} abilityRecovery - number of points to recover per ability
   */
  _rest(abilityRecovery) {
    return this.parent.update({
      "system.hp.value": this.hp.max,
      "system.abilities.str.value": Math.min(this.abilities.str.value + abilityRecovery, this.abilities.str.max),
      "system.abilities.dex.value": Math.min(this.abilities.dex.value + abilityRecovery, this.abilities.dex.max),
      "system.abilities.wil.value": Math.min(this.abilities.wil.value + abilityRecovery, this.abilities.wil.max),
    })
  }

  fullRest() {
    return this._rest(1)
  }

  secureRest() {
    return this._rest(2)
  }

  medicalRest() {
    return this._rest(3)
  }
}
