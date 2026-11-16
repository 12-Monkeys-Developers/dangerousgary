import { DamageCard } from "../damage.mjs"
import DangerousGaryDamageMessageData from "../models/damage-message.mjs"

export default class DangerousGaryChatMessage extends ChatMessage {
  static DAMAGE_TEMPLATE = "systems/dangerousgary/templates/damage-card.hbs"

  /** @inheritDoc */
  async renderHTML({ canDelete, canClose = false, ...rest } = {}) {
    const html = await super.renderHTML({ canDelete, canClose, ...rest })
    this._enrichChatCard(html)
    // Jet caché à cet utilisateur : le cœur a déjà rendu un contenu neutre, la carte dévoilerait le résultat et les cibles
    if (this.type === "damage" && this.isContentVisible) await this._renderDamageCard(html)
    return html
  }

  /**
   * Rend la carte de dégâts à la place du contenu du message, et active ses boutons.
   * @param {HTMLElement} html L'élément du message.
   */
  async _renderDamageCard(html) {
    const content = html.querySelector(".message-content")
    if (!content) return
    content.innerHTML = await foundry.applications.handlebars.renderTemplate(DangerousGaryChatMessage.DAMAGE_TEMPLATE, this._prepareDamageContext())
    content.addEventListener("click", this._onDamageCardAction.bind(this))
  }

  /**
   * Le contexte de rendu de la carte de dégâts : un joueur ne voit le détail (armure, dégâts réels, PV, Force) que pour un personnage.
   * @returns {object}
   */
  _prepareDamageContext() {
    const system = this.system
    const Data = DangerousGaryDamageMessageData
    return {
      system,
      label: game.i18n.format("DANGEROUSGARY.Roll.AttackRollDamage", { itemName: system.source }),
      targets: system.targets.map((target) => ({
        ...target,
        showDetail: Data.canSeeDetail(target),
        hpLost: Data.hpLost(target),
        strLost: Data.strLost(target),
        isDead: target.applied && target.strAfter === 0 && Data.canSeeDetail(target),
        canRollStrSave: Data.canRollStrSave(target),
        triggers: target.triggers.map((trigger) => ({
          ...trigger,
          summary: DamageCard.describeTrigger(trigger),
          canRollSave: Data.canRollTriggerSave(target, trigger),
          saveLabel: trigger.save ? game.i18n.format("DANGEROUSGARY.Trigger.RollSave", { ability: game.i18n.localize(`DANGEROUSGARY.Labels.short.${trigger.save}`) }) : "",
        })),
      })),
      canApply: game.user.isGM && system.hasPendingTargets,
    }
  }

  /**
   * Clic sur un bouton de la carte de dégâts.
   * @param {PointerEvent} event
   */
  async _onDamageCardAction(event) {
    const button = event.target.closest("[data-action]")
    if (!button) return
    switch (button.dataset.action) {
      case "applyDamage":
        button.disabled = true
        return DamageCard.apply(this)
      case "rollStrSave":
        button.disabled = true
        return DamageCard.rollStrSave(this, Number(button.dataset.index))
      case "rollTriggerSave":
        button.disabled = true
        return DamageCard.rollTriggerSave(this, Number(button.dataset.index), Number(button.dataset.triggerIndex))
      case "panToToken":
        return DamageCard.panToToken(button.dataset.tokenUuid)
    }
  }

  /**
   * Get the Actor which is the author of a chat card.
   * @returns {Actor|void}
   */
  getAssociatedActor() {
    if (this.speaker.scene && this.speaker.token) {
      const scene = game.scenes.get(this.speaker.scene)
      const token = scene?.tokens.get(this.speaker.token)
      if (token) return token.actor
    }
    return game.actors.get(this.speaker.actor)
  }

  /**
   * Enriches the chat card HTML by adding avatar and name elements.
   * Creates and appends an avatar image and stacked name display to the message sender element.
   * The displayed content depends on whether the message content is visible to the current user.
   *
   * @param {HTMLElement} html The HTML element of the chat card to be enriched.
   * @private
   * @returns {void}
   */
  _enrichChatCard(html) {
    const actor = this.getAssociatedActor()

    let img
    let nameText
    if (this.isContentVisible) {
      img = actor?.img ?? this.author.avatar
      nameText = this.alias
    } else {
      img = this.author.avatar
      nameText = this.author.name
    }

    const avatar = document.createElement("a")
    avatar.classList.add("avatar")
    if (actor) avatar.dataset.uuid = actor.uuid
    const avatarImg = document.createElement("img")
    Object.assign(avatarImg, { src: img, alt: nameText })
    avatar.append(avatarImg)

    const name = document.createElement("span")
    name.classList.add("name-stacked")
    const title = document.createElement("span")
    title.classList.add("title")
    title.append(nameText)
    name.append(title)

    const sender = html.querySelector(".message-sender")
    sender?.replaceChildren(avatar, name)
  }
}
