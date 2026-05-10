export default class DGToggleSwitchElement extends HTMLElement {
  connectedCallback() {
    const track = document.createElement("track")
    const thumb = document.createElement("thumb")
    track.append(thumb)
    this.replaceChildren(track)
    this.addEventListener("click", this._onClick.bind(this))
    this.addEventListener("dblclick", (e) => e.stopPropagation())
    this.addEventListener("pointerdown", (e) => e.stopPropagation())
  }

  get checked() {
    return this.hasAttribute("checked")
  }

  set checked(value) {
    this.toggleAttribute("checked", value)
  }

  _onClick(event) {
    event.preventDefault()
    this.checked = !this.checked
    this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }))
  }
}

window.customElements.define("dg-toggle-switch", DGToggleSwitchElement)
