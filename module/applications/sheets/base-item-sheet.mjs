const { HandlebarsApplicationMixin } = foundry.applications.api

export default class DangerousGaryBaseItemSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {

  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

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
