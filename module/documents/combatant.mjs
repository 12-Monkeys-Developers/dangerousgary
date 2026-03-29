export default class DangerousGaryCombatant extends foundry.documents.Combatant {
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId)
    if (game.user.isGM) this.setFlag("world", "hasActed", false)
  }
}
