import DangerousGaryChat from "../chat.mjs"

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
   * @returns
   */
  async rollSave(ability, { useMax = false, talentName = null, talentLevel = null } = {}) {
    const roll = await new Roll("1d20").roll()
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
    }

    // Talent failure: lose HP equal to talent level, overflow to STR
    if (!success && talentLevel) {
      let damage = talentLevel
      const currentHp = this.system.hp.value
      const hpLost = Math.min(damage, currentHp)
      const strLost = damage - hpLost
      const updates = { "system.hp.value": currentHp - hpLost }
      if (strLost > 0) {
        updates["system.abilities.str.value"] = Math.max(0, this.system.abilities.str.value - strLost)
      }
      await this.update(updates)
      chatData.talentDamage = damage
      chatData.talentHpLost = hpLost
      chatData.talentStrLost = strLost
    }

    let chat = await new DangerousGaryChat(this).withTemplate("systems/dangerousgary/templates/roll-result.hbs").withData(chatData).withRolls([roll]).create()

    await chat.display()

    return { roll, total, success }
  }

  /**
   *
   * @param {*} itemName
   * @param {*} formula
   */
  async rollDamage(itemName, formula, { criticalDamage = false } = {}) {
    const rollFormula = criticalDamage ? formula.replace(/(\d+d\d+)/gi, "$1xo") : formula
    const roll = await new Roll(rollFormula).roll()
    const result = roll.total
    const isCriticalDamage = criticalDamage && roll.dice.some(die => die.results.some(r => r.exploded))

    const label = game.i18n.format("DANGEROUSGARY.Roll.AttackRollDamage", { itemName })

    let chatData = {
      rollType: "damage",
      actingCharName: this.name,
      actingCharImg: this.img,
      introText: label,
      total: roll.total,
      formula: roll.formula,
      isCriticalDamage,
    }

    let chat = await new DangerousGaryChat(this).withTemplate("systems/dangerousgary/templates/roll-result.hbs").withData(chatData).withRolls([roll]).create()

    await chat.display()

    return { roll, result }
  }
}
