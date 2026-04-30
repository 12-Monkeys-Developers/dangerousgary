export default class DangerousGaryArtefactData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      description: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
      allowedClasses: new fields.SetField(
        new fields.StringField({
          choices: {
            bard: "DANGEROUSGARY.Talent.Classes.bard",
            cleric: "DANGEROUSGARY.Talent.Classes.cleric",
            druid: "DANGEROUSGARY.Talent.Classes.druid",
            fighter: "DANGEROUSGARY.Talent.Classes.fighter",
            mage: "DANGEROUSGARY.Talent.Classes.mage",
            monk: "DANGEROUSGARY.Talent.Classes.monk",
            paladin: "DANGEROUSGARY.Talent.Classes.paladin",
            ranger: "DANGEROUSGARY.Talent.Classes.ranger",
            thief: "DANGEROUSGARY.Talent.Classes.thief",
          },
        })
      ),
      artefactCapacities: new fields.TypedObjectField(
        new fields.SchemaField({
          level: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 1, choices: { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9" } }),
          description: new fields.HTMLField({ required: false, blank: true, initial: "" }),
        }),
        { validateKey: key => ["1", "2", "3"].includes(key) }
      ),
    }
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["DANGEROUSGARY.Artefact"]

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    let updates = {}
    const stats = this.parent._stats

    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource) {
      if (!foundry.utils.hasProperty(data, "img")) {
        updates.img = "icons/svg/item-bag.svg"
      }
    }
    this.parent.updateSource(updates)
  }
}
