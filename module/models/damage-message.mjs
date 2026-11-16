/**
 * Données d'un message de tchat de type "damage" : un jet de dégâts lancé sur une ou plusieurs cibles.
 * La carte est rendue à partir de ces données et du jet du message (rolls[0]).
 */
export default class DangerousGaryDamageMessageData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields
    const points = () => new fields.NumberField({ required: true, nullable: true, integer: true, initial: null })

    return {
      // Nom de l'arme ou de l'attaque
      source: new fields.StringField({ required: true, blank: true, initial: "" }),
      formula: new fields.StringField({ required: true, blank: true, initial: "" }),
      total: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      isCriticalDamage: new fields.BooleanField({ required: true, initial: false }),
      isConstrained: new fields.BooleanField({ required: true, initial: false }),
      isExalted: new fields.BooleanField({ required: true, initial: false }),
      ignoreArmour: new fields.BooleanField({ required: true, initial: false }),
      // Résultat naturel du premier dé de dégâts : il active les déclencheurs de l'attaque
      natural: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),
      targets: new fields.ArrayField(
        new fields.SchemaField({
          // Acteur de la cible (acteur synthétique pour un token non lié)
          uuid: new fields.StringField({ required: true, blank: true, initial: "" }),
          tokenUuid: new fields.StringField({ required: true, blank: true, initial: "" }),
          name: new fields.StringField({ required: true, blank: true, initial: "" }),
          img: new fields.StringField({ required: true, blank: true, initial: "" }),
          type: new fields.StringField({ required: true, blank: true, initial: "" }),
          armour: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
          // Dégâts réels : total moins l'armure
          real: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
          // Défense de la cible : dégâts divisés par deux avant l'armure
          halved: new fields.BooleanField({ required: true, initial: false }),
          applied: new fields.BooleanField({ required: true, initial: false }),
          hpBefore: points(),
          hpAfter: points(),
          strBefore: points(),
          strAfter: points(),
          // Sauvegarde de Force lancée après un débordement des dégâts
          saveRolled: new fields.BooleanField({ required: true, initial: false }),
          // Déclencheurs de l'attaque activés par ce jet, et leur résolution pour cette cible
          triggers: new fields.ArrayField(
            new fields.SchemaField({
              name: new fields.StringField({ required: true, blank: true, initial: "" }),
              text: new fields.StringField({ required: true, blank: true, initial: "" }),
              save: new fields.StringField({ required: true, blank: true, initial: "" }),
              effect: new fields.StringField({ required: true, blank: false, initial: "none" }),
              formula: new fields.StringField({ required: true, blank: true, initial: "" }),
              ongoing: new fields.BooleanField({ required: true, initial: false }),
              // pending : sauvegarde à lancer ; saved : sauvegarde réussie ; applied : effet subi ; info : rien à appliquer
              status: new fields.StringField({ required: true, blank: false, initial: "info", choices: ["pending", "saved", "applied", "info"] }),
              // Dégâts subis ou points de caractéristique perdus
              amount: points(),
            }),
          ),
        }),
      ),
    }
  }

  /**
   * Reste-t-il des dégâts à appliquer.
   * @type {boolean}
   */
  get hasPendingTargets() {
    return this.targets.some((t) => !t.applied)
  }

  /**
   * PV perdus par une cible dont les dégâts sont appliqués.
   * @param {object} target Une cible de la carte.
   * @returns {number}
   */
  static hpLost(target) {
    return target.applied ? target.hpBefore - target.hpAfter : 0
  }

  /**
   * Force perdue par une cible : les dégâts qui débordent des PV.
   * @param {object} target Une cible de la carte.
   * @returns {number}
   */
  static strLost(target) {
    return target.applied ? target.strBefore - target.strAfter : 0
  }

  /**
   * L'utilisateur voit-il le détail d'une cible (armure, dégâts réels, PV et Force) :
   * tout le monde pour un personnage, le MJ seul pour une rencontre.
   * @param {object} target Une cible de la carte.
   * @param {User} [user]
   * @returns {boolean}
   */
  static canSeeDetail(target, user = game.user) {
    return user.isGM || target.type === "character"
  }

  /**
   * L'utilisateur peut-il lancer la sauvegarde d'un déclencheur en attente : le MJ ou un propriétaire de la cible.
   * @param {object} target Une cible de la carte.
   * @param {object} trigger Un déclencheur de la cible.
   * @param {User} [user]
   * @returns {boolean}
   */
  static canRollTriggerSave(target, trigger, user = game.user) {
    if (!target.applied || trigger?.status !== "pending") return false
    if (user.isGM) return true
    const actor = fromUuidSync(target.uuid)
    return !!actor?.testUserPermission(user, "OWNER")
  }

  /**
   * L'utilisateur peut-il lancer la sauvegarde de Force d'une cible : les dégâts ont débordé sur la Force,
   * il lui en reste, la sauvegarde n'a pas été lancée, et il est MJ ou propriétaire de la cible.
   * @param {object} target Une cible de la carte.
   * @param {User} [user]
   * @returns {boolean}
   */
  static canRollStrSave(target, user = game.user) {
    if (!target.applied || target.saveRolled) return false
    if (DangerousGaryDamageMessageData.strLost(target) <= 0 || target.strAfter <= 0) return false
    if (user.isGM) return true
    const actor = fromUuidSync(target.uuid)
    return !!actor?.testUserPermission(user, "OWNER")
  }
}
