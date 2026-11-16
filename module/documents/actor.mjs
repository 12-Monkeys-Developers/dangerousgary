import DangerousGaryChat from "../chat.mjs"
import { DamageCard } from "../damage.mjs"
import { CONSTRAINING_STATUSES, EXALTING_STATUS, STATUS_EFFECTS, UNLUCKY_STATUS } from "../config.mjs"

export default class DangerousGaryActor extends Actor {
  get isCharacter() {
    return this.type === "character"
  }

  get isEncounter() {
    return this.type === "encounter"
  }

  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user)

    // Configure prototype token settings
    const prototypeToken = {}
    if (this.type === "character") {
      Object.assign(prototypeToken, {
        sight: { enabled: true, visionMode: "basic" },
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      })
      this.updateSource({ prototypeToken })
    }
  }

  /**
   * Roll a save for ability
   * @param {*} ability
   * @param root0
   * @param root0.useMax
   * @param root0.talentName
   * @param root0.talentLevel
   * @returns
   */
  async rollSave(ability, { useMax = false, talentName = null, talentLevel = null } = {}) {
    // Malchance : deux dés, le pire (le plus haut) est gardé
    const isUnlucky = this.statuses.has(UNLUCKY_STATUS)
    const roll = await new Roll(isUnlucky ? "2d20kh" : "1d20").roll()
    const total = roll.total
    const abilityValue = useMax ? this.system.abilities[ability].max : this.system.abilities[ability].value
    const isCritical = total === 1
    const isFumble = total === 20
    const success = total <= abilityValue || isCritical

    const abilityShort = game.i18n.localize(`DANGEROUSGARY.Labels.short.${ability}`)
    const introText = game.i18n.format("DANGEROUSGARY.Roll.SaveRoll", { ability: abilityShort, value: abilityValue })

    let chatData = {
      rollType: "save",
      abilityValue,
      actingCharName: this.name,
      actingCharImg: this.img,
      talentName: talentName || null,
      introText,
      total,
      success,
      isCritical,
      isFumble,
      isClassSave: useMax,
      isUnlucky,
    }

    // Talent failure: lose HP equal to talent level, overflow to STR
    if (!success && talentLevel) {
      const result = await this.applyDamage(talentLevel)
      chatData.talentDamage = talentLevel
      chatData.talentHpLost = result.hpBefore - result.hpAfter
      chatData.talentStrLost = result.strBefore - result.strAfter
    }

    let chat = await new DangerousGaryChat(this).withTemplate("systems/dangerousgary/templates/roll-result.hbs").withData(chatData).withRolls([roll]).create()

    await chat.display()

    return { roll, total, success }
  }

  /**
   * Le type d'attaque imposé par les états de l'acteur : contrainte (Contraint, Étourdi, Ralenti, Aveugle), exaltée (Exalté),
   * normale sinon ou si les deux se compensent.
   * @type {"normal"|"constrained"|"exalted"}
   */
  get statusAttackType() {
    const constrained = CONSTRAINING_STATUSES.some((status) => this.statuses.has(status))
    const exalted = this.statuses.has(EXALTING_STATUS)
    if (constrained === exalted) return "normal"
    return constrained ? "constrained" : "exalted"
  }

  /**
   * Armure déduite des dégâts subis : celle de la rencontre, ou celle des équipements équipés du personnage.
   * @type {number}
   */
  get armour() {
    return this.system.armour ?? 0
  }

  /**
   * Applique des dégâts (armure déjà déduite) : ils sont retirés des PV, et ce qui déborde est retiré de la Force.
   * @param {number} damage Les dégâts réels.
   * @returns {Promise<{hpBefore: number, hpAfter: number, strBefore: number, strAfter: number}>} Les PV et la Force avant et après.
   */
  async applyDamage(damage) {
    const hpBefore = this.system.hp.value
    const strBefore = this.system.abilities.str.value
    const hpLost = Math.min(Math.max(0, damage), hpBefore)
    const strLost = Math.min(Math.max(0, damage) - hpLost, strBefore)
    const hpAfter = hpBefore - hpLost
    const strAfter = strBefore - strLost
    const updates = {}
    if (hpLost > 0) updates["system.hp.value"] = hpAfter
    if (strLost > 0) updates["system.abilities.str.value"] = strAfter
    if (!foundry.utils.isEmpty(updates)) await this.update(updates)
    return { hpBefore, hpAfter, strBefore, strAfter }
  }

  /**
   * Lance les dégâts d'une arme ou d'une attaque. Si des tokens sont ciblés, les dégâts leur sont appliqués.
   * @param {*} itemName
   * @param {*} formula
   * @param root0
   * @param root0.criticalDamage
   * @param root0.constrained
   * @param root0.exalted
   * @param {Item} [root0.item] L'attaque d'une rencontre : armure ignorée, déclencheurs
   */
  async rollDamage(itemName, formula, { criticalDamage = false, constrained, exalted, item = null } = {}) {
    // Sans type d'attaque choisi, les états de l'acteur l'imposent
    if (constrained === undefined && exalted === undefined) {
      const attackType = this.statusAttackType
      constrained = attackType === "constrained"
      exalted = attackType === "exalted"
    }
    constrained = !!constrained
    exalted = !!exalted
    let roll
    if (constrained) {
      roll = await new Roll("1d4").roll()
    } else if (exalted) {
      const maxFormula = formula.replace(/(\d+)d(\d+)/gi, (_, num, faces) => String(Number(num) * Number(faces)))
      roll = await new Roll(maxFormula).roll()
    } else {
      const rollFormula = criticalDamage ? formula.replace(/(\d+d\d+)/gi, "$1xo") : formula
      roll = await new Roll(rollFormula).roll()
    }
    const result = roll.total
    const isCriticalDamage = !constrained && !exalted && criticalDamage && roll.dice.some((die) => die.results.some((r) => r.exploded))

    const label = game.i18n.format("DANGEROUSGARY.Roll.AttackRollDamage", { itemName })

    // Des tokens sont ciblés : carte de dégâts, appliqués à chaque cible
    // Attaque d'une rencontre : armure ignorée, déclencheurs activés par le résultat naturel du dé (le maximum pour une attaque exaltée)
    const ignoreArmour = !!item?.system.ignoreArmour
    const natural = exalted ? Math.max(0, ...Array.from(formula.matchAll(/d(\d+)/gi), (m) => Number(m[1]))) || null : (roll.dice[0]?.results[0]?.result ?? null)
    const triggers = item?.system.firedTriggers?.(natural) ?? []

    const targets = DamageCard.getTargets(roll.total, { ignoreArmour, triggers })
    if (targets.length) {
      const system = { source: itemName, formula: roll.formula, total: roll.total, isCriticalDamage, isConstrained: constrained, isExalted: exalted, ignoreArmour, natural, targets }
      const chat = await new DangerousGaryChat(this).withContent(label).withType("damage", system).withRolls([roll]).create()
      await chat.display()
      await DamageCard.apply(chat.chat)
      return { roll, result }
    }

    let chatData = {
      rollType: "damage",
      actingCharName: this.name,
      actingCharImg: this.img,
      introText: label,
      total: roll.total,
      formula: roll.formula,
      isCriticalDamage,
      isConstrained: constrained,
      isExalted: exalted,
      ignoreArmour,
      // Sans cible, les déclencheurs activés sont rappelés sur la carte
      triggers: triggers.map((trigger) => ({ name: trigger.name, summary: DamageCard.describeTrigger(trigger) })),
    }

    let chat = await new DangerousGaryChat(this).withTemplate("systems/dangerousgary/templates/roll-result.hbs").withData(chatData).withRolls([roll]).create()

    await chat.display()

    return { roll, result }
  }

  async promptDamageRoll(itemName, formula, { criticalDamage = false, item = null } = {}) {
    // Le type imposé par les états de l'acteur est présélectionné
    const checked = (type) => (this.statusAttackType === type ? "checked" : "")
    // Mêmes icônes que les états Contraint et Exalté
    const icon = (statusId) => `<img class="attack-type-icon" src="${STATUS_EFFECTS.find((status) => status.id === statusId).img}" alt="" />`
    const attackType = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("DANGEROUSGARY.Dialog.DamageOptions") },
      content: `
        <fieldset class="damage-options">
          <legend>${game.i18n.localize("DANGEROUSGARY.Dialog.AttackType")}</legend>
          <label><input type="radio" name="attackType" value="normal" ${checked("normal")}> ${game.i18n.localize("DANGEROUSGARY.Dialog.Normal")}</label>
          <label><input type="radio" name="attackType" value="constrained" ${checked("constrained")}> ${icon("constrained")} ${game.i18n.localize("DANGEROUSGARY.Dialog.Constrained")}</label>
          <label><input type="radio" name="attackType" value="exalted" ${checked("exalted")}> ${icon(EXALTING_STATUS)} ${game.i18n.localize("DANGEROUSGARY.Dialog.Exalted")}</label>
        </fieldset>
      `,
      ok: {
        label: game.i18n.localize("DANGEROUSGARY.RollDamage"),
        callback: (event, button, dialog) => new FormData(button.form).get("attackType"),
      },
      rejectClose: false,
    })
    if (!attackType) return
    return this.rollDamage(itemName, formula, {
      item,
      criticalDamage,
      constrained: attackType === "constrained",
      exalted: attackType === "exalted",
    })
  }
}
