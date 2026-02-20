export default class DangerousGaryAttackData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      description: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
      damageFormula: new fields.StringField({ required: false, nullable: true }),
    }
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["DANGEROUSGARY.Attack"]

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    let updates = {}
    const stats = this.parent._stats

    // Pour un item non dupliqué, non provenant d'un compendium et non exporté
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource) {
      // Image par défaut
      if (!foundry.utils.hasProperty(data, "img")) {
        updates.img = "icons/svg/sword.svg"
      }
    }
    this.parent.updateSource(updates)
  }

  get hasDamage() {
    return !!this.damageFormula
  }
}
