import DangerousGaryChat from "../chat.mjs"

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
      equipmentMisc: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      perkName: new fields.StringField({ required: false, blank: true, initial: "" }),
      perk: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      specialties: new fields.SchemaField({
        first: new fields.StringField({ required: false, blank: true, initial: "" }),
        second: new fields.StringField({ required: false, blank: true, initial: "" }),
        third: new fields.StringField({ required: false, blank: true, initial: "" }),
      }),
      osmose: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 3 }),
      // Le personnage est dans un Donjon : bonus d'Osmose aux talents, sauvegarde d'Osmose sur un 1
      inDungeon: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      classes: new fields.SchemaField({
        assassin: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
        cleric: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
        fighter: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
        paladin: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
        druid: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
        monk: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
        thief: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
        bard: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
        mage: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
        ranger: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 }),
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

  /**
   * Niveau du donjexeur quand une règle ne précise pas de classe (aura de terreur, Osmose) : son niveau le plus élevé parmi ses classes.
   * @type {number}
   */
  get level() {
    return Math.max(0, ...Object.values(this.classes))
  }

  /**
   * Armure du personnage : somme de l'armure de ses équipements de type Armure équipés.
   * @type {number}
   */
  get armour() {
    return this.parent.itemTypes.equipment.filter((i) => i.system.isArmor && i.system.isEquipped).reduce((total, i) => total + (i.system.armour ?? 0), 0)
  }

  /**
   * Les repos : PV au maximum, et FOR, DEX, VOL augmentées de `recovery` (plafonnées au maximum). La Pause ne rend que les PV.
   * `icon` : icône de la fiche ; `img` : image de la macro créée par glisser-déposer.
   * @type {Record<string, {recovery: number, label: string, icon: string, img: string}>}
   */
  static RESTS = {
    short: { recovery: 0, label: "DANGEROUSGARY.Labels.long.shortRest", icon: "fa-solid fa-mug-hot", img: "icons/svg/tankard.svg" },
    full: { recovery: 1, label: "DANGEROUSGARY.Labels.long.fullRest", icon: "fa-solid fa-bed", img: "icons/svg/sleep.svg" },
    secure: { recovery: 2, label: "DANGEROUSGARY.Labels.long.secureRest", icon: "fa-solid fa-house-lock", img: "icons/svg/house.svg" },
    medical: { recovery: 3, label: "DANGEROUSGARY.Labels.long.medicalRest", icon: "fa-solid fa-kit-medical", img: "icons/svg/heal.svg" },
  }

  /**
   * Prend un repos et l'annonce dans le tchat, avec les PV et caractéristiques avant / après.
   * Une caractéristique remontée au-dessus de 0 perd son état posé automatiquement (Actor#_onUpdate).
   * @param {"short"|"full"|"secure"|"medical"} type Le repos.
   * @returns {Promise<ChatMessage|undefined>} Le message du tchat.
   */
  async rest(type) {
    const rest = DangerousGaryCharacterData.RESTS[type]
    if (!rest) return
    const lines = [{ key: "hp", before: this.hp.value, after: this.hp.max }]
    for (const key of ["str", "dex", "wil"]) {
      const { value, max } = this.abilities[key]
      lines.push({ key, before: value, after: Math.max(value, Math.min(value + rest.recovery, max)) })
    }
    const updates = {}
    for (const { key, before, after } of lines) {
      if (after !== before) updates[key === "hp" ? "system.hp.value" : `system.abilities.${key}.value`] = after
    }
    if (!foundry.utils.isEmpty(updates)) await this.parent.update(updates)

    const data = {
      title: game.i18n.format(`DANGEROUSGARY.Rest.Title.${type}`, { name: this.parent.name }),
      icon: rest.icon,
      lines: lines.map(({ key, before, after }) => ({ label: game.i18n.localize(`DANGEROUSGARY.Labels.short.${key}`), before, after, changed: after !== before })),
    }
    const chat = await new DangerousGaryChat(this.parent).withTemplate("systems/dangerousgary/templates/rest-result.hbs").withData(data).create()
    await chat?.display()
    return chat?.chat
  }

  /** Pause : PV au maximum. */
  shortRest() {
    return this.rest("short")
  }

  /** Repos : PV au maximum, +1 FOR, DEX et VOL. */
  fullRest() {
    return this.rest("full")
  }

  /** Repos sécurisé : PV au maximum, +2 FOR, DEX et VOL. */
  secureRest() {
    return this.rest("secure")
  }

  /** Repos médicalisé : PV au maximum, +3 FOR, DEX et VOL. */
  medicalRest() {
    return this.rest("medical")
  }
}
