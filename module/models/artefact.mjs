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

  /**
   * Le meilleur niveau d'un personnage parmi les classes nécessaires à l'artefact.
   * @param {Actor|null} actor Le personnage.
   * @returns {number}
   */
  bestClassLevel(actor) {
    const classes = actor?.system.classes
    if (!classes) return 0
    return Math.max(0, ...Array.from(this.allowedClasses, (key) => classes[key] ?? 0))
  }

  /**
   * Les capacités que l'utilisateur peut voir : toutes pour le MJ ou si le réglage « Dévoiler les capacités des artefacts » est actif,
   * sinon celles dont le personnage qui porte l'artefact a le niveau dans une classe nécessaire.
   * @param {User} [user]
   * @returns {Array<[string, object]>} Les couples clé / capacité.
   */
  visibleCapacities(user = game.user) {
    const capacities = Object.entries(this.artefactCapacities)
    if (user.isGM || game.settings.get("dangerousgary", "revealArtefactCapacities")) return capacities
    const level = this.bestClassLevel(this.parent.actor)
    return capacities.filter(([, capacity]) => capacity.level <= level)
  }

  /**
   * Les classes nécessaires que l'utilisateur peut voir : toutes pour le MJ ou si le réglage « Dévoiler les capacités des artefacts » est actif,
   * sinon celles dans lesquelles le personnage qui porte l'artefact atteint le niveau requis par au moins une capacité.
   * @param {User} [user]
   * @returns {string[]} Les clés des classes.
   */
  visibleClasses(user = game.user) {
    const allowed = Array.from(this.allowedClasses)
    if (user.isGM || game.settings.get("dangerousgary", "revealArtefactCapacities")) return allowed
    const classes = this.parent.actor?.system.classes
    if (!classes) return []
    const levels = Object.values(this.artefactCapacities).map((capacity) => capacity.level)
    const required = levels.length ? Math.min(...levels) : 1
    return allowed.filter((key) => (classes[key] ?? 0) >= required)
  }

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
