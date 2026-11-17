import { canManageAssassin, denyAssassin, isAssassinTalent } from "./assassin.mjs"
export class Macros {
  static createDangerousGaryMacro = async function (dropData, slot) {
    switch (dropData.type) {
      case "rollDamage": {
        const actor = game.actors.get(dropData.actorId)
        const item = actor?.items.get(dropData.itemId)
        if (!item) return
        const command = `// Clic: Jet de dégâts | Shift+Clic: Options (contrainte/exaltée)\nconst actor = game.actors.get('${dropData.actorId}')\nconst item = actor?.items.get('${dropData.itemId}')\nif (item) { if (event?.shiftKey) { actor.promptDamageRoll(item.name, item.system.damageFormula, { criticalDamage: item.system.criticalDamage }) } else { actor.rollDamage(item.name, item.system.damageFormula, { criticalDamage: item.system.criticalDamage }) } }`
        const macroName = `${item.name} (${actor.name})`
        this.createMacro(slot, macroName, command, item.img)
        break
      }
      case "rollAttack": {
        const actor = await fromUuid(dropData.actorUuid)
        const item = actor?.items.get(dropData.itemId)
        if (!item) return
        // Token sélectionné de cette Rencontre (tokens non liés compris), sinon la Rencontre d'où vient la macro
        const command = `// Clic: Jet de dégâts | Shift+Clic: Options (contrainte/exaltée)\nconst actor = canvas.tokens?.controlled.map((t) => t.actor).find((a) => a?.id === '${actor.id}') ?? (await fromUuid('${actor.uuid}'))\nconst item = actor?.items.get('${item.id}') ?? actor?.items.getName(${JSON.stringify(item.name)})\nif (item) { const options = { item, criticalDamage: !!item.system.criticalDamage }; if (event?.shiftKey) { actor.promptDamageRoll(item.name, item.system.damageFormula, options) } else { actor.rollDamage(item.name, item.system.damageFormula, options) } }`
        const macroName = `${item.name} (${actor.name})`
        this.createMacro(slot, macroName, command, item.img)
        break
      }
      case "rollSave": {
        const actor = game.actors.get(dropData.actorId)
        if (!actor) return
        const ability = dropData.ability
        const abilityLabel = game.i18n.localize(`DANGEROUSGARY.Labels.short.${ability}`)
        const command = `// Clic: Jet de caractéristique | Shift+Clic: Jet de classe (max)\nconst actor = game.actors.get('${dropData.actorId}')\nif (actor) actor.rollSave('${ability}', { useMax: event?.shiftKey })`
        const macroName = `${abilityLabel} (${actor.name})`
        this.createMacro(slot, macroName, command, "icons/svg/d20-grey.svg")
        break
      }
      case "rollClassSave": {
        const actor = dropData.actorUuid ? await fromUuid(dropData.actorUuid) : game.actors.get(dropData.actorId)
        const item = actor?.items.get(dropData.itemId)
        if (!item || item.type !== "talent") return
        const assassin = isAssassinTalent(item)
        if (assassin && !canManageAssassin(actor)) return denyAssassin()
        const key = assassin ? "assassin" : item.system.talentClass
        const command = `const actor = await fromUuid(${JSON.stringify(actor.uuid)})\nif (actor) await actor.rollClassSave(${JSON.stringify(key)}, { talentId: ${JSON.stringify(item.id)} })`
        await this.createMacro(slot, `${item.name} (${actor.name})`, command, item.img || "icons/svg/sun.svg", { assassin })
        break
      }
    }
  }

  static createMacro = async function (slot, name, command, img, { assassin = false } = {}) {
    if (assassin && !game.user.isGM) return denyAssassin()
    let macro = game.macros.contents.find((m) => m.name === name)
    if (!macro) {
      macro = await Macro.create(
        {
          name: name,
          type: "script",
          img: img,
          command: command,
          flags: { "dangerousgary.macro": true, dangerousgary: { assassin } },
          ...(assassin ? { ownership: { default: 0 } } : {}),
        },
        { displaySheet: false },
      )
    }
    if (assassin && macro) await macro.update({ command, ownership: { default: 0 }, flags: { ...macro.flags, dangerousgary: { ...macro.flags.dangerousgary, assassin: true } } }, { recursive: false })
    const alreadyInHotbar = Object.values(game.user.hotbar).includes(macro.id)
    if (!alreadyInHotbar) {
      game.user.assignHotbarMacro(macro, slot)
    }
  }
}
