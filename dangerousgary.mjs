import { secretMacroAllowed } from "./module/assassin.mjs"
// Import Modules
import * as models from "./module/models/_module.mjs"
import * as documents from "./module/documents/_module.mjs"
import * as applications from "./module/applications/_module.mjs"
import { Macros } from "./module/macros.mjs"
import { DamageCard } from "./module/damage.mjs"
import { STATUS_EFFECTS } from "./module/config.mjs"
import { registerDungeonBadge } from "./module/token-dungeon.mjs"
import "./module/elements/toggle-switch.mjs"

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
    talent: models.DangerousGaryTalentData,
    artefact: models.DangerousGaryArtefactData
  };

  // Chat
  CONFIG.ChatMessage.documentClass = documents.DangerousGaryChatMessage
  CONFIG.ChatMessage.dataModels = {
    damage: models.DangerousGaryDamageMessageData,
    round: models.DangerousGaryRoundMessageData
  }

  // Requêtes traitées par le MJ actif pour les joueurs
  CONFIG.queries[DamageCard.QUERY_APPLY] = DamageCard._handleApplyQuery
  CONFIG.queries[DamageCard.QUERY_UPDATE_TARGET] = DamageCard._handleUpdateTargetQuery
  CONFIG.queries[documents.DangerousGaryChatMessage.QUERY_MARK_OSMOSE] = documents.DangerousGaryChatMessage._handleMarkOsmoseQuery

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("dangerousgary", applications.DangerousGaryCharacterSheet, { types: ["character"], makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("dangerousgary", applications.DangerousGaryEncounterSheet, { types: ["encounter"], makeDefault: true });
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("dangerousgary", applications.DangerousGaryItemSheet, { types: ["equipment"], makeDefault: true });
  foundry.documents.collections.Items.registerSheet("dangerousgary", applications.DangerousGaryAttackSheet, { types: ["attack"], makeDefault: true });
  foundry.documents.collections.Items.registerSheet("dangerousgary", applications.DangerousGaryTalentSheet, { types: ["talent"], makeDefault: true });
  foundry.documents.collections.Items.registerSheet("dangerousgary", applications.DangerousGaryArtefactSheet, { types: ["artefact"], makeDefault: true });

  // États : la liste du système remplace celle du cœur
  // (le tableau du cœur indexe aussi les états par identifiant : on le vide et on le remplit, sans le remplacer)
  CONFIG.statusEffects.length = 0
  CONFIG.statusEffects.push(...STATUS_EFFECTS.map((status) => ({ ...status })))

  // Combat
  CONFIG.ui.combat = applications.DangerousGaryCombatTracker
  CONFIG.Combat.documentClass = documents.DangerousGaryCombat
  CONFIG.Combatant.documentClass = documents.DangerousGaryCombatant

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

  game.settings.register("dangerousgary", "revealArtefactCapacities", {
    name: "DANGEROUSGARY.Settings.revealArtefactCapacities.name",
    hint: "DANGEROUSGARY.Settings.revealArtefactCapacities.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    // Les fiches ouvertes affichent aussitôt les capacités dévoilées ou masquées
    onChange: () => {
      for (const app of foundry.applications.instances.values()) {
        if (app.document?.type === "character" || app.document?.type === "artefact") app.render()
      }
    },
  })

})

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (["rollDamage", "rollAttack", "rollSave", "rollClassSave", "rest", "Item"].includes(data.type)) {
    Macros.createDangerousGaryMacro(data, slot)
    return false
  }
})

Hooks.on("preCreateMacro", secretMacroAllowed)
// Pastille « Dans un Donjon » en haut à droite du token
registerDungeonBadge()
Hooks.on("preUpdateMacro", secretMacroAllowed)
