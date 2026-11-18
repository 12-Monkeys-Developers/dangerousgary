import DangerousGaryActor from "./actor.mjs"
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
    this._activateSaveButtons(html)
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
        case "rollShockSave":
          button.disabled = true
          return RoundCard.rollShockSave(this, Number(button.dataset.index))
        case "panToToken":
          return DamageCard.panToToken(button.dataset.tokenUuid)
      }
    })
  }

  static QUERY_MARK_OSMOSE = "dangerousgary.markOsmoseRolled"

  /**
   * Boutons de sauvegarde d'une carte de jet, mémorisés dans le message une fois lancés : sauvegarde d'Osmose (un 1 dans un Donjon)
   * et sauvegarde de Force contre le choc (échec de talent qui entame la Force).
   * @type {Record<string, {flag: string, label: (value: *, actor: Actor) => string, roll: (actor: Actor) => Promise}>}
   */
  static SAVE_BUTTONS = {
    rollOsmose: { flag: "osmoseRolled", label: () => game.i18n.localize("DANGEROUSGARY.Osmose.Rolled"), roll: (actor) => actor.rollOsmose() },
    // Le flag garde le résultat ("success" / "failure") pour l'afficher sur la carte d'origine
    rollShockSave: {
      flag: "strSaveRolled",
      label: (value, actor) => (value === true ? game.i18n.localize("DANGEROUSGARY.Damage.StrSaveDone") : DangerousGaryActor.shockResultText(actor?.name ?? "", value === "success")),
      roll: (actor) => actor.rollShockSave(),
    },
  }

  /**
   * Active les boutons de sauvegarde d'une carte de jet : réservés au MJ et aux propriétaires du personnage, retirés pour les autres.
   * Une fois la sauvegarde lancée, le message le retient et le bouton est remplacé pour tout le monde.
   * @param {HTMLElement} html L'élément du message.
   */
  _activateSaveButtons(html) {
    for (const [action, { flag, label, roll }] of Object.entries(DangerousGaryChatMessage.SAVE_BUTTONS)) {
      const button = html.querySelector(`[data-action="${action}"]`)
      if (!button) continue
      const actor = fromUuidSync(button.dataset.actorUuid)
      const done = this.getFlag("dangerousgary", flag)
      if (done) {
        const span = document.createElement("span")
        span.classList.add("osmose-rolled")
        if (done === "failure") span.classList.add("failure")
        span.textContent = label(done, actor)
        button.replaceWith(span)
        continue
      }
      if (!actor || !(game.user.isGM || actor.isOwner)) {
        button.remove()
        continue
      }
      button.addEventListener("click", async (event) => {
        event.preventDefault()
        if (this.getFlag("dangerousgary", flag)) return
        button.disabled = true
        const result = await roll(actor)
        // Osmose : simple marque ; choc : le résultat, affiché sur la carte
        await this.#markSaveRolled(flag, flag === "osmoseRolled" ? true : result?.success ? "success" : "failure")
      })
    }
  }

  /**
   * Note dans le message qu'une sauvegarde a été lancée : directement si l'utilisateur peut modifier le message, sinon par le MJ actif.
   * @param {string} flag Le flag de la sauvegarde.
   * @param {true|"success"|"failure"} [value] La valeur enregistrée : simple marque, ou résultat de la sauvegarde.
   * @returns {Promise<void>}
   */
  async #markSaveRolled(flag, value = true) {
    if (this.canUserModify(game.user, "update")) {
      await this.setFlag("dangerousgary", flag, value)
      return
    }
    const gm = game.users.activeGM
    if (!gm) return ui.notifications.warn("DANGEROUSGARY.Damage.NoActiveGM", { localize: true })
    await gm.query(DangerousGaryChatMessage.QUERY_MARK_OSMOSE, { messageId: this.id, flag, value })
  }

  /**
   * Requête "dangerousgary.markOsmoseRolled" côté MJ : demandée par un propriétaire du personnage de la carte,
   * pour l'un des boutons de sauvegarde de la carte.
   * @param {object} data
   * @param {string} data.messageId L'id du message.
   * @param {string} [data.flag] Le flag de la sauvegarde (osmoseRolled par défaut).
   * @param {object} context
   * @param {User} context.user L'utilisateur qui a envoyé la requête.
   * @returns {Promise<boolean>} Le message a-t-il été marqué.
   */
  static async _handleMarkOsmoseQuery({ messageId, flag = "osmoseRolled", value = true }, { user }) {
    if (![true, "success", "failure"].includes(value)) return false
    const message = game.messages.get(messageId)
    const entry = Object.entries(DangerousGaryChatMessage.SAVE_BUTTONS).find(([, button]) => button.flag === flag)
    if (!message || !entry) return false
    const uuid = message.content.match(new RegExp(`data-action="${entry[0]}" data-actor-uuid="([^"]+)"`))?.[1]
    const actor = uuid ? await fromUuid(uuid) : null
    if (!actor?.testUserPermission(user, "OWNER")) return false
    await message.setFlag("dangerousgary", flag, value)
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
        shockResult: target.saveRolled && typeof target.saveSuccess === "boolean" ? DangerousGaryActor.shockResultText(target.name, target.saveSuccess) : "",
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
