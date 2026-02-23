// Import Modules
import * as models from "./module/models/_module.mjs"
import * as documents from "./module/documents/_module.mjs"
import * as applications from "./module/applications/_module.mjs"
import { Macros } from "./module/macros.mjs"

Hooks.once('init', async function () {

  // Expose the system API
  game.system.api = {
    applications,
    models,
    documents,
  }

  // Actor
  CONFIG.Actor.documentClass = documents.DangerousGaryActor;
  CONFIG.Actor.dataModels = {
    character: models.DangerousGaryCharacterData,
    encounter: models.DangerousGaryEncounterData
  };

  // Item
  CONFIG.Item.documentClass = documents.DangerousGaryItem;
  CONFIG.Item.dataModels = {
    equipment: models.DangerousGaryItemData,
    attack: models.DangerousGaryAttackData,
    talent: models.DangerousGaryTalentData
  };

  // Chat
  CONFIG.ChatMessage.documentClass = documents.DangerousGaryChatMessage

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("dangerousgary", applications.DangerousGaryCharacterSheet, { types: ["character"], makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("dangerousgary", applications.DangerousGaryEncounterSheet, { types: ["encounter"], makeDefault: true });
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("dangerousgary", applications.DangerousGaryItemSheet, { types: ["equipment"], makeDefault: true });
  foundry.documents.collections.Items.registerSheet("dangerousgary", applications.DangerousGaryAttackSheet, { types: ["attack"], makeDefault: true });
  foundry.documents.collections.Items.registerSheet("dangerousgary", applications.DangerousGaryTalentSheet, { types: ["talent"], makeDefault: true });

  // Combat
  CONFIG.ui.combat = applications.DangerousGaryCombatTracker
  CONFIG.Combat.documentClass = documents.DangerousGaryCombat

  // Settings
  game.settings.register("dangerousgary", "enableClasses", {
    name: "DANGEROUSGARY.Settings.enableClasses.name",
    hint: "DANGEROUSGARY.Settings.enableClasses.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  })

})

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (["rollDamage", "Item"].includes(data.type)) {
    Macros.createDangerousGaryMacro(data, slot)
    return false
  }
})
