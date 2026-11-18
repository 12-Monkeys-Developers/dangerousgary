/**
 * Données d'un message de tchat de type "round" : les effets continus et les régénérations à traiter au début d'un round.
 */
export default class DangerousGaryRoundMessageData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      round: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      entries: new fields.ArrayField(
        new fields.SchemaField({
          // Acteur concerné (acteur synthétique pour un token non lié)
          uuid: new fields.StringField({ required: true, blank: true, initial: "" }),
          tokenUuid: new fields.StringField({ required: true, blank: true, initial: "" }),
          name: new fields.StringField({ required: true, blank: true, initial: "" }),
          img: new fields.StringField({ required: true, blank: true, initial: "" }),
          type: new fields.StringField({ required: true, blank: true, initial: "" }),
          // Id de l'effet continu posé sur l'acteur ; vide pour la régénération d'une rencontre
          effectId: new fields.StringField({ required: true, blank: true, initial: "" }),
          label: new fields.StringField({ required: true, blank: true, initial: "" }),
          // damage, str, dex, wil, xp ou heal
          effect: new fields.StringField({ required: true, blank: false, initial: "damage" }),
          formula: new fields.StringField({ required: true, blank: true, initial: "" }),
          ignoreArmour: new fields.BooleanField({ required: true, initial: false }),
          status: new fields.StringField({ required: true, blank: false, initial: "pending", choices: ["pending", "applied", "ended"] }),
          amount: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),
          // Sauvegarde de Force contre le choc après des dégâts qui entament la Force : "" sans objet, pending à lancer, rolled lancée
          strSave: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", "pending", "rolled", "success", "failure"] }),
        }),
      ),
    }
  }
}
