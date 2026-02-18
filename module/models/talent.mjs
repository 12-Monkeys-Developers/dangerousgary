export default class DangerousGaryTalentData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      talentClass: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
        choices: {
          cleric: "DANGEROUSGARY.Talent.Classes.cleric",
          fighter: "DANGEROUSGARY.Talent.Classes.fighter",
          paladin: "DANGEROUSGARY.Talent.Classes.paladin",
          druid: "DANGEROUSGARY.Talent.Classes.druid",
          monk: "DANGEROUSGARY.Talent.Classes.monk",
          thief: "DANGEROUSGARY.Talent.Classes.thief",
          bard: "DANGEROUSGARY.Talent.Classes.bard",
          mage: "DANGEROUSGARY.Talent.Classes.mage",
          ranger: "DANGEROUSGARY.Talent.Classes.ranger",
        },
      }),
      level: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
      description: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
      special: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    }
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["DANGEROUSGARY.Talent"]
}
