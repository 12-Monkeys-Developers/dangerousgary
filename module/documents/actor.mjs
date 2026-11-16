import DangerousGaryChat from "../chat.mjs"
import { DamageCard } from "../damage.mjs"
import { CONSTRAINING_STATUSES, EXALTING_STATUS, ONGOING_ICONS, STATUS_EFFECTS, UNLUCKY_STATUS } from "../config.mjs"

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
    // Sauvegarde de classe (valeur max) : le libellé de la carte la distingue de la sauvegarde de caractéristique
    const introText = game.i18n.format(useMax ? "DANGEROUSGARY.Roll.ClassSaveRoll" : "DANGEROUSGARY.Roll.SaveRoll", { ability: abilityShort, value: abilityValue })

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
   * Le type d'attaque d'un jet de dégâts sans choix explicite : celui des états de l'acteur combiné à celui qu'imposent
   * les défenses des cibles (contrainte et exaltée se compensent).
   * @param {{attackType: string}} [defence] Les défenses des cibles (DamageCard.targetsDefence).
   * @returns {"normal"|"constrained"|"exalted"}
   */
  getAttackType(defence = DamageCard.targetsDefence(this)) {
    const score = { constrained: -1, normal: 0, exalted: 1 }
    const total = score[this.statusAttackType] + score[defence.attackType]
    if (total === 0) return "normal"
    return total < 0 ? "constrained" : "exalted"
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
   * Applique un effet chiffré à l'acteur : dégâts (armure déduite), perte de points d'une caractéristique ou d'expérience, ou soin.
   * @param {object} data
   * @param {"none"|"damage"|"str"|"dex"|"wil"|"xp"|"heal"} data.effect L'effet.
   * @param {string} data.formula La formule : un dé ou un nombre.
   * @param {object} [options]
   * @param {boolean} [options.ignoreArmour] Les dégâts ignorent l'armure.
   * @returns {Promise<number|null>} Les dégâts subis, les points perdus ou les PV regagnés ; null sans effet chiffré.
   */
  async applyEffect({ effect, formula }, { ignoreArmour = false } = {}) {
    if (effect === "none" || !formula) return null
    const roll = await new Roll(String(formula)).evaluate()
    const value = Math.max(0, roll.total)
    if (effect === "damage") {
      const real = Math.max(0, value - (ignoreArmour ? 0 : this.armour))
      await this.applyDamage(real)
      return real
    }
    if (effect === "heal") {
      const { value: hp, max } = this.system.hp
      const healed = Math.max(0, Math.min(value, max - hp))
      if (healed > 0) await this.update({ "system.hp.value": hp + healed })
      return healed
    }
    // Perte d'expérience : seuls les personnages en ont
    const path = effect === "xp" ? "system.xp" : `system.abilities.${effect}.value`
    const current = foundry.utils.getProperty(this, path)
    if (typeof current !== "number") return 0
    const lost = Math.min(value, current)
    if (lost > 0) await this.update({ [path]: current - lost })
    return lost
  }

  /**
   * Les effets continus posés sur l'acteur : proposés à chaque changement de round tant qu'ils ne sont pas retirés.
   * @type {ActiveEffect[]}
   */
  get ongoingEffects() {
    return this.effects.filter((effect) => effect.getFlag("dangerousgary", "ongoing"))
  }

  /**
   * Pose un effet continu sur l'acteur.
   * @param {object} data
   * @param {string} data.name Le nom de l'effet.
   * @param {string} data.effect Ce qu'il fait à chaque round : damage, str, dex, wil ou xp.
   * @param {string} data.formula La formule appliquée à chaque round.
   * @param {boolean} [data.ignoreArmour] Les dégâts ignorent l'armure.
   * @param {string} [data.text] Une précision (comment y mettre fin…).
   * @returns {Promise<ActiveEffect>}
   */
  async addOngoingEffect({ name, effect, formula, ignoreArmour = false, text = "" }) {
    const [created] = await this.createEmbeddedDocuments("ActiveEffect", [
      {
        name: name || game.i18n.localize("DANGEROUSGARY.Ongoing.Title"),
        img: ONGOING_ICONS[effect] ?? ONGOING_ICONS.damage,
        description: text,
        showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
        flags: { dangerousgary: { ongoing: { effect, formula, ignoreArmour } } },
      },
    ])
    return created
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
    // Défenses des cibles : type d'attaque imposé, deux dés de dégâts en gardant le plus bas
    const defence = DamageCard.targetsDefence(this)
    if (defence.mixed) ui.notifications.warn("DANGEROUSGARY.Defence.MixedTargets", { localize: true })
    // Sans type d'attaque choisi, les états de l'acteur et les défenses des cibles l'imposent
    if (constrained === undefined && exalted === undefined) {
      const attackType = this.getAttackType(defence)
      constrained = attackType === "constrained"
      exalted = attackType === "exalted"
    }
    constrained = !!constrained
    exalted = !!exalted
    let roll
    if (constrained) {
      roll = await new Roll(defence.keepLowest ? "2d4kl1" : "1d4").roll()
    } else if (exalted) {
      const maxFormula = formula.replace(/(\d+)d(\d+)/gi, (_, num, faces) => String(Number(num) * Number(faces)))
      roll = await new Roll(maxFormula).roll()
    } else {
      let rollFormula = criticalDamage ? formula.replace(/(\d+d\d+)/gi, "$1xo") : formula
      // Deux dés de dégâts, le plus bas est gardé
      if (defence.keepLowest) rollFormula = rollFormula.replace(/(\d+)d(\d+)(xo)?/gi, (_, num, faces, xo) => `${Number(num) * 2}d${faces}${xo ?? ""}kl${num}`)
      roll = await new Roll(rollFormula).roll()
    }
    const result = roll.total
    const isCriticalDamage = !constrained && !exalted && criticalDamage && roll.dice.some((die) => die.results.some((r) => r.exploded))

    const label = game.i18n.format("DANGEROUSGARY.Roll.AttackRollDamage", { itemName })

    // Des tokens sont ciblés : carte de dégâts, appliqués à chaque cible
    // Attaque d'une rencontre : armure ignorée, déclencheurs activés par le résultat naturel du dé (le maximum pour une attaque exaltée)
    const ignoreArmour = !!item?.system.ignoreArmour
    const natural = exalted ? Math.max(0, ...Array.from(formula.matchAll(/d(\d+)/gi), (m) => Number(m[1]))) || null : (roll.dice[0]?.results.find((r) => r.active)?.result ?? null)
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
    // Le type imposé par les états de l'acteur et les défenses des cibles est présélectionné
    const defaultType = this.getAttackType()
    const checked = (type) => (defaultType === type ? "checked" : "")
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
