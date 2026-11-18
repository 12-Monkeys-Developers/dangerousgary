# 1.4.1

- Repos : les quatre repos (Pause, Repos, Repos sécurisé, Repos médicalisé) quittent le menu de la barre de titre pour quatre icônes dans l'en-tête de la fiche de personnage, glissables dans la barre de macros ; chaque repos est annoncé dans le tchat avec les PV et caractéristiques avant et après
- Santé : une caractéristique tombée à 0 pose son état (Force → Mort et combattant vaincu, Dextérité → Paralysé, Volonté → Inconscient), retiré quand elle remonte au-dessus de 0 ; une sauvegarde de Force ratée après des dégâts qui entament la Force pose l'état Inconscient (choc) ; la sauvegarde de Force est aussi proposée après l'échec d'un talent, les dégâts supplémentaires d'un effet spécial et les dégâts d'un effet continu
- Osmose : un clic sur le mot Osmose (onglet Classe et talents) lance la sauvegarde d'Osmose ; ratée, une case de la jauge est cochée et la carte indique l'Atout d'Osmose de la classe la plus haute, ou la Disparition si les trois cases l'étaient déjà
- Osmose : nouvelle case « Donjon » après la jauge (signalée dans l'en-tête de la fiche) ; dans un Donjon, la sauvegarde de classe d'un talent reçoit un bonus de +3 par case cochée, et un 1 sur une sauvegarde fait proposer la sauvegarde d'Osmose par un bouton sur la carte du tchat

# 1.4.0

- Ciblage : un jet de dégâts lancé avec des tokens ciblés applique les dégâts à chaque cible (armure déduite, armure équipée pour un personnage), les dégâts qui débordent des PV étant retirés de la Force ; la carte du tchat liste les cibles et propose la sauvegarde de Force. Les joueurs ne voient que les dégâts infligés à une rencontre, le MJ voit son armure et les dégâts réels
- Nouveau réglage « Dévoiler les capacités des artefacts » (désactivé par défaut) : sans lui, un joueur ne voit plus que les capacités dont son personnage a le niveau requis, les autres étant masquées
- Fiche de personnage, onglet Équipement : l'infobulle d'un artefact affiche sa description puis ses capacités avec leur niveau requis ; sans le réglage « Dévoiler les capacités des artefacts », un joueur n'y voit que les capacités accessibles, et seules les classes nécessaires dont il atteint le niveau sont affichées (sur la fiche de personnage comme sur la fiche de l'artefact)
- Classe Assassin native, réservée aux PNJ et au MJ : bloc dédié, talents embarqués, sauvegarde calculée sur la moyenne arrondie à l’inférieur des maxima de FOR/DEX/VOL, jets et macros privés MJ. Les joueurs ne voient pas la classe sur les talents ni les artefacts ; un transfert de propriété vers un joueur est bloqué tant que ces données subsistent.
- Rencontre : une attaque avec des dégâts peut être glissée dans la barre de macros (Clic : jet de dégâts, Maj+Clic : options) ; la macro s'applique au token sélectionné de cette rencontre
- Attaques des rencontres : cases « Dommages critiques » (dé explosif) et « Ignore l'armure », et effets spéciaux déclenchés par le résultat du dé de dégâts ou à chaque coup (dégâts supplémentaires, perte de FOR/DEX/VOL, sauvegarde pour l'éviter, texte libre) ; la carte de dégâts les applique à la cible ou propose la sauvegarde
- États : le système propose sa propre liste d'états sur le HUD des tokens ; Contraint, Étourdi, Ralenti et Aveugle rendent les attaques contraintes, Exalté les rend exaltées, Malchance fait lancer deux dés aux sauvegardes en gardant le pire
- Tchat : la carte d'une sauvegarde de classe (Maj+Clic sur une caractéristique, talent) l'indique dans son libellé, au lieu de la seule infobulle
- Fiches Personnage et Rencontre : le nom n'est modifiable qu'en mode Écriture, de même que l'armure d'une rencontre ; un talent ne peut être déposé sur un personnage qu'en mode Écriture
- Rencontre : cadre « Défenses » — attaques contre elle contraintes ou exaltées, dégâts reçus divisés par deux ou lancés avec deux dés en gardant le plus bas, aura de terreur (attaques contraintes pour les donjexeurs dont le niveau le plus élevé ne dépasse pas l'aura) ; ces défenses s'appliquent au jet de dégâts quand la rencontre est ciblée
- Effets continus : un effet spécial d'attaque peut être coché « chaque round » (dégâts, perte de FOR/DEX/VOL ou d'XP) ; il est posé sur la cible, affiché sur son token et sa fiche, et proposé au MJ à chaque changement de round sur une carte de tchat (Appliquer / Mettre fin à l'effet). Une rencontre peut aussi avoir une régénération de PV par round
- Suivi de combat : le bouton « A joué » est le dernier des boutons d'un combattant ; un joueur peut marquer son combattant comme ayant joué mais ne peut plus l'annuler, le MJ change l'état de tous librement
- Suivi de combat : les boutons Tour précédent et Tour suivant sont retirés ; le bouton Round suivant n'est cliquable que lorsque tous les combattants (hors vaincus) ont joué ; un clic du MJ sur un combattant sélectionne son token, centre la vue et en fait le combattant actif
- Correction : sur la fiche d'un artefact, le bouton d'édition de la description d'une capacité était coupé ou recouvrait le texte
- Correction : dans le suivi de combat, les infobulles des boutons Masquer, Vaincu, Ping et Centrer affichaient leur clé au lieu de leur traduction (clés renommées en V14) ; le bouton « A joué » n'était plus affiché aux joueurs
- Fiches : le texte indicatif d'un champ de formule vide (« formule, ex. 1d6 ») est en italique et estompé, pour ne plus être confondu avec une valeur saisie

# 1.3.8

- Guide du système : nouveau compendium « Guide du système » (7 pages illustrées : réglages, personnage, classes et artefacts, rencontre, jets, combat et macros), réservé au MJ par défaut
- Correction : l'utilisation d'une capacité d'artefact depuis la fiche de personnage ne faisait rien (identifiant de l'artefact absent du bouton)
- Compatibilité : Foundry VTT V14 uniquement
- Visibilité des jets selon le mode choisi dans le tchat via l'API V14 (`core.rollMode` est déprécié)
- Suivi de combat : le libellé du bouton « A joué » est traduit (anglais : « Has acted »)

# 1.3.7

- Fiches items (Équipement, Attaque, Talent, Artefact) : le nom n'est modifiable qu'en mode Écriture
- Correction de l'infobulle de description des attaques (Rencontre), des items et des talents (Personnage) : une description contenant un jet (ex. `[[/r 1d6]]`) ou un lien ne s'affiche plus dans le nom
- Technique : fins de ligne LF dans tout le dépôt (`.gitattributes`, `.editorconfig`)

# 1.3.6

- Release technique : correction de l'url du manifeste

# 1.3.5

- Ajoute le support de Foundry V14
- Personnage, onglet Talents, drop d'un talent : message d'avertissement si le talent est déjà possédé
- Personnage, onglet Talents : ajout de la scrollbar verticale

# 1.3.0

- Artefacts : nouveau type d'item avec capacités utilisables et message dédié dans le chat
- Mise à jour automatique du niveau de classe lors de l'ajout ou la suppression d'un talent
- Slider Lecture/Écriture sur les fiches items (Équipement, Attaque, Talent, Artefact)
- Slider Lecture/Écriture sur les fiches actors (Personnage, Rencontre)
- Drag-and-drop d'un talent vers la hotbar : crée une macro de jet de sauvegarde de classe

# 1.2.0

- Combat tracker : les combattants qui ont déjà joué sont automatiquement placés après ceux qui n'ont pas encore joué (bouton "A joué" pour le MJ et les owners)
- Combat tracker : au début de chaque round, les PJ sont classés par dextérité décroissante
- Combat tracker : le drag-and-drop reste disponible pour réordonner librement pendant le round
- Combat tracker : les combattants ayant joué sont visuellement atténués (opacité réduite)
- Attaques contraintes et exaltées : Shift+Clic sur le dé de dégâts pour choisir le type d'attaque (contrainte = 1d4, exaltée = dégâts max)
- Macro hotbar arme : Shift+Clic ouvre le dialogue d'options de dégâts
- Zone de saisie libre "Équipement divers" sous la liste d'items dans l'onglet Équipement
- Shift+Clic sur une caractéristique (fiche personnage) : jet de classe (valeur max)
- Drag-and-drop des caractéristiques vers la hotbar (Clic : jet normal, Shift+Clic : jet de classe)
- Infobulle dans le chat précisant le type de sauvegarde (caractéristique ou classe)
- Correction de l'affichage des items en mode sombre : labels, listes déroulantes et champs de saisie désormais lisibles sur les fiches Talent, Équipement et Attaque

# 1.1.1

- Release officielle
- Un équipement de type Arme peut être ajouté à la hotbar : il permet de lancer les dégâts
- Prise en compte du thème Sombre
- Grid : 1,5m par défaut

# 1.1.0

- Combat tracker personnalisé avec initiative de groupe (PJ puis PNJ) et réordonnancement par drag-and-drop
- Ajout des dégâts critiques sur les armes (dés explosifs) avec indicateur visuel dans le chat et l'inventaire
- Ajout de la catégorie d'arme avec pré-remplissage automatique des dégâts et du critique
- Nouveau sous-type d'équipement : Artefact (disponible si l'option Classes & Talents est activée)
- Perte de PV (et de FOR si insuffisant) en cas d'échec d'un jet de talent, avec indication dans le chat

# 1.0.0

- Première version beta
