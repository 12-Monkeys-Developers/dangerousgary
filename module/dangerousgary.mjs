// Import Modules
import DangerousGaryActor from "./documents/actor.mjs";
import DangerousGaryItem from "./documents/item.mjs";
import DangerousGaryCharacterData from "./models/character.mjs";
import DangerousGaryEncounterData from "./models/encounter.mjs";
import DangerousGaryItemData from "./models/item.mjs";
import DangerousGaryAttackData from "./models/attack.mjs";
import DangerousGaryCharacterSheet from "./applications/sheets/character-sheet.mjs";
import DangerousGaryEncounterSheet from "./applications/sheets/encounter-sheet.mjs";
import DangerousGaryItemSheet from "./applications/sheets/item-sheet.mjs";
import DangerousGaryAttackSheet from "./applications/sheets/attack-sheet.mjs";

Hooks.once('init', async function () {

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "@dex - 1d20",
    decimals: 1
  };

  // Define custom Entity classes
  CONFIG.Actor.documentClass = DangerousGaryActor;
  CONFIG.Actor.dataModels = {
    character: DangerousGaryCharacterData,
    encounter: DangerousGaryEncounterData
  };

  CONFIG.Item.documentClass = DangerousGaryItem;
  CONFIG.Item.dataModels = {
    equipment: DangerousGaryItemData,
    attack: DangerousGaryAttackData
  };

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("dangerousgary", DangerousGaryCharacterSheet, { types: ["character"], makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("dangerousgary", DangerousGaryEncounterSheet, { types: ["encounter"], makeDefault: true });
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("dangerousgary", DangerousGaryItemSheet, { types: ["equipment"], makeDefault: true });
  foundry.documents.collections.Items.registerSheet("dangerousgary", DangerousGaryAttackSheet, { types: ["attack"], makeDefault: true });

});
