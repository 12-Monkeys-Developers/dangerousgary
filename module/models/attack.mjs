export default class DangerousGaryAttackData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      description: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
      damageFormula: new fields.StringField({ required: false, nullable: true }),
      // Dé explosif : sur le résultat maximal, le dé est relancé une fois et ajouté
      criticalDamage: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      ignoreArmour: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      // Effets spéciaux déclenchés par le résultat naturel du dé de dégâts (ou à chaque coup), indexés par un identifiant
      triggers: new fields.TypedObjectField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true, blank: true, initial: "" }),
          // Plage de faces du dé de dégâts qui déclenche l'effet ; vide = à chaque coup
          min: new fields.NumberField({ required: true, nullable: true, integer: true, min: 1, initial: null }),
          max: new fields.NumberField({ required: true, nullable: true, integer: true, min: 1, initial: null }),
          // Sauvegarde qui évite l'effet ; vide = pas de sauvegarde
          save: new fields.StringField({ required: true, blank: true, initial: "", choices: DangerousGaryAttackData.ABILITIES }),
          effect: new fields.StringField({ required: true, blank: false, initial: "none", choices: DangerousGaryAttackData.TRIGGER_EFFECTS }),
          formula: new fields.StringField({ required: true, blank: true, initial: "" }),
          // Effet continu : au lieu d'être subi une fois, il est posé sur la cible et proposé à chaque changement de round
          ongoing: new fields.BooleanField({ required: true, initial: false }),
          text: new fields.StringField({ required: true, blank: true, initial: "" }),
        }),
      ),
    }
  }

  static ABILITIES = {
    str: "DANGEROUSGARY.Labels.short.str",
    dex: "DANGEROUSGARY.Labels.short.dex",
    wil: "DANGEROUSGARY.Labels.short.wil",
  }

  // Effet d'un déclencheur : aucun (texte seul), dégâts supplémentaires, ou perte de points d'une caractéristique
  static TRIGGER_EFFECTS = {
    none: "DANGEROUSGARY.Trigger.Effects.none",
    damage: "DANGEROUSGARY.Trigger.Effects.damage",
    str: "DANGEROUSGARY.Trigger.Effects.str",
    dex: "DANGEROUSGARY.Trigger.Effects.dex",
    wil: "DANGEROUSGARY.Trigger.Effects.wil",
    xp: "DANGEROUSGARY.Trigger.Effects.xp",
  }

  /**
   * Les déclencheurs activés par un jet de dégâts.
   * @param {number|null} natural Le résultat naturel du premier dé de dégâts, ou null sans dé.
   * @returns {object[]} Les déclencheurs, prêts à être enregistrés dans une carte de dégâts.
   */
  firedTriggers(natural) {
    return Object.values(this.triggers)
      .filter((trigger) => {
        if (trigger.min === null && trigger.max === null) return true
        if (natural === null) return false
        return natural >= (trigger.min ?? trigger.max) && natural <= (trigger.max ?? trigger.min)
      })
      .map(({ name, save, effect, formula, ongoing, text }) => ({ name, save, effect, formula, ongoing, text }))
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
