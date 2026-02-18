// Import Modules
import * as models from "./models/_module.mjs"
import * as documents from "./documents/_module.mjs"
import * as applications from "./applications/_module.mjs"

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

});
