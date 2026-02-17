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
   * A Full Rest requires a week of downtime at a comfortable location. This restores all Ability Scores
   */
  fullRest() {
    return this.parent.update({
      "system.hp.value": this.hp.max,
      "system.abilities.str.value": this.abilities.str.max,
      "system.abilities.dex.value": this.abilities.dex.max,
      "system.abilities.wil.value": this.abilities.wil.max,
    })
  }
}
