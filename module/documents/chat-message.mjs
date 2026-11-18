import { DamageCard } from "../damage.mjs"
import { RoundCard } from "../round.mjs"
import DangerousGaryDamageMessageData from "../models/damage-message.mjs"

export default class DangerousGaryChatMessage extends ChatMessage {
  static DAMAGE_TEMPLATE = "systems/dangerousgary/templates/damage-card.hbs"

  /** @inheritDoc */
  async renderHTML({ canDelete, canClose = false, ...rest } = {}) {
    const html = await super.renderHTML({ canDelete, canClose, ...rest })
    this._enrichChatCard(html)
    // Jet caché à cet utilisateur : le cœur a déjà rendu un contenu neutre, la carte dévoilerait le résultat et les cibles
    if (this.type === "damage" && this.isContentVisible) await this._renderDamageCard(html)
    if (this.type === "round" && this.isContentVisible) await this._renderRoundCard(html)
    this._activateOsmoseButton(html)
    return html
  }

  /**
   * Rend la carte de début de round (effets continus, régénérations) à la place du contenu du message, et active ses boutons.
   * @param {HTMLElement} html L'élément du message.
   */
  async _renderRoundCard(html) {
    const content = html.querySelector(".message-content")
    if (!content) return
    content.innerHTML = await foundry.applications.handlebars.renderTemplate("systems/dangerousgary/templates/round-card.hbs", RoundCard.prepareContext(this))
    content.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]")
      if (!button) return
      switch (button.dataset.action) {
        case "applyOngoing":
          button.disabled = true
          return RoundCard.apply(this, Number(button.dataset.index))
        case "endOngoing":
          button.disabled = true
          return RoundCard.end(this, Number(button.dataset.index))
        case "panToToken":
          return DamageCard.panToToken(button.dataset.tokenUuid)
      }
    })
  }

  static QUERY_MARK_OSMOSE = "dangerousgary.markOsmoseRolled"

  /**
   * Bouton « Sauvegarde d'Osmose » d'une sauvegarde obtenant un 1 dans un Donjon : réservé au MJ et aux propriétaires
   * du personnage, retiré pour les autres. Une fois la sauvegarde lancée, le message le retient (flag osmoseRolled)
   * et le bouton est remplacé pour tout le monde par « Sauvegarde d'Osmose lancée ».
   * @param {HTMLElement} html L'élément du message.
   */
  _activateOsmoseButton(html) {
    const button = html.querySelector('[data-action="rollOsmose"]')
    if (!button) return
    if (this.getFlag("dangerousgary", "osmoseRolled")) {
      const done = document.createElement("span")
      done.classList.add("osmose-rolled")
      done.innerHTML = `<i class="fas fa-check"></i> ${game.i18n.localize("DANGEROUSGARY.Osmose.Rolled")}`
      button.replaceWith(done)
      return
    }
    const actor = fromUuidSync(button.dataset.actorUuid)
    if (!actor || !(game.user.isGM || actor.isOwner)) {
      button.remove()
      return
    }
    button.addEventListener("click", async (event) => {
      event.preventDefault()
      if (this.getFlag("dangerousgary", "osmoseRolled")) return
      button.disabled = true
      await actor.rollOsmose()
      await this.#markOsmoseRolled()
    })
  }

  /**
   * Note dans le message que la sauvegarde d'Osmose a été lancée : directement si l'utilisateur peut modifier le message,
   * sinon par le MJ actif.
   * @returns {Promise<void>}
   */
  async #markOsmoseRolled() {
    if (this.canUserModify(game.user, "update")) {
      await this.setFlag("dangerousgary", "osmoseRolled", true)
      return
    }
    const gm = game.users.activeGM
    if (!gm) return ui.notifications.warn("DANGEROUSGARY.Damage.NoActiveGM", { localize: true })
    await gm.query(DangerousGaryChatMessage.QUERY_MARK_OSMOSE, { messageId: this.id })
  }

  /**
   * Requête "dangerousgary.markOsmoseRolled" côté MJ : demandée par un propriétaire du personnage de la carte.
   * @param {object} data
   * @param {string} data.messageId L'id du message.
   * @param {object} context
   * @param {User} context.user L'utilisateur qui a envoyé la requête.
   * @returns {Promise<boolean>} Le message a-t-il été marqué.
   */
  static async _handleMarkOsmoseQuery({ messageId }, { user }) {
    const message = game.messages.get(messageId)
    const uuid = message?.content.match(/data-action="rollOsmose" data-actor-uuid="([^"]+)"/)?.[1]
    const actor = uuid ? await fromUuid(uuid) : null
    if (!actor?.testUserPermission(user, "OWNER")) return false
    await message.setFlag("dangerousgary", "osmoseRolled", true)
    return true
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
