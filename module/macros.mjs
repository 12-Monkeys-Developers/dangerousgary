export class Macros {
  static createDangerousGaryMacro = async function (dropData, slot) {
    switch (dropData.type) {
      case "rollDamage":
        const actor = game.actors.get(dropData.actorId)
        const item = actor?.items.get(dropData.itemId)
        if (!item) return
        const command = `const actor = game.actors.get('${dropData.actorId}')\nconst item = actor?.items.get('${dropData.itemId}')\nif (item) actor.rollDamage(item.name, item.system.damageFormula, { criticalDamage: item.system.criticalDamage })`
        const macroName = `${item.name} (${actor.name})`
        this.createMacro(slot, macroName, command, item.img)
        break
    }
  }

  static createMacro = async function (slot, name, command, img) {
    let macro = game.macros.contents.find((m) => m.name === name)
    if (!macro) {
      macro = await Macro.create(
        {
          name: name,
          type: "script",
          img: img,
          command: command,
          flags: { "dangerousgary.macro": true },
        },
        { displaySheet: false },
      )
    }
    const alreadyInHotbar = Object.values(game.user.hotbar).includes(macro.id)
    if (!alreadyInHotbar) {
      game.user.assignHotbarMacro(macro, slot)
    }
  }
}
