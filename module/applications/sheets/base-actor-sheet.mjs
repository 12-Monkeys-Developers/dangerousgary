const { HandlebarsApplicationMixin } = foundry.applications.api
const { sheets } = foundry.applications
import { DamageCard } from "../../damage.mjs"

export default class DangerousGaryBaseActorSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {

  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      endOngoing: DangerousGaryBaseActorSheet.#onEndOngoing,
    },
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    // Effets continus posés sur l'acteur, proposés à chaque changement de round
    context.ongoingEffects = this.actor.ongoingEffects.map((effect) => {
      const ongoing = effect.getFlag("dangerousgary", "ongoing")
      return { id: effect.id, name: effect.name, img: effect.img, text: effect.description, summary: DamageCard.describeTrigger({ ...ongoing, ongoing: true }) }
    })
    context.canEndOngoing = game.user.isGM
    return context
  }

  /**
   * Met fin à un effet continu de l'acteur.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Le bouton, qui porte l'id de l'effet.
   */
  static async #onEndOngoing(event, target) {
    await this.actor.effects.get(target.dataset.effectId)?.delete()
  }

  _sheetMode = this.constructor.SHEET_MODES.PLAY

  get isEditMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.EDIT
  }

  get isPlayMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.PLAY
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)
    this._renderModeToggle(this.element)
  }

  _renderModeToggle(element) {
    const header = element.querySelector(".window-header")
    const existing = header.querySelector(".mode-slider")
    if (this.isEditable && !existing) {
      const toggle = document.createElement("dg-toggle-switch")
      toggle.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT
      toggle.classList.add("mode-slider")
      toggle.dataset.tooltip = "DANGEROUSGARY.SheetModeEdit"
      toggle.setAttribute("aria-label", game.i18n.localize("DANGEROUSGARY.SheetModeEdit"))
      toggle.addEventListener("change", this._onSheetChangeLock.bind(this))
      header.prepend(toggle)
    } else if (this.isEditable) {
      existing.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT
    } else if (!this.isEditable && existing) {
      existing.remove()
    }
  }

  async _onSheetChangeLock(event) {
    event.preventDefault()
    const modes = this.constructor.SHEET_MODES
    this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT
    await this.submit()
    this.render()
  }
}
