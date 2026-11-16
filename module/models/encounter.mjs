export default class DangerousGaryEncounterData extends foundry.abstract.TypeDataModel {
    /** @override */
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            description: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
            hp: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
                max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
            }),
            abilities: new fields.SchemaField({
                str: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
                    max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
                }),
                dex: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
                    max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
                }),
                wil: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
                    max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
                })
            }),
            armour: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
            powers: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
            // Défenses : type imposé aux attaques qui la ciblent, réduction des dégâts reçus, aura de terreur
            attacksAgainst: new fields.StringField({ required: true, blank: false, initial: "normal", choices: DangerousGaryEncounterData.ATTACKS_AGAINST }),
            damageReduction: new fields.StringField({ required: true, blank: false, initial: "none", choices: DangerousGaryEncounterData.DAMAGE_REDUCTIONS }),
            // Les attaques des donjexeurs de niveau inférieur ou égal sont contraintes ; 0 = pas d'aura
            terror: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 9 })
        };
    }

    static ATTACKS_AGAINST = {
        normal: "DANGEROUSGARY.Defence.AttacksAgainst.normal",
        constrained: "DANGEROUSGARY.Defence.AttacksAgainst.constrained",
        exalted: "DANGEROUSGARY.Defence.AttacksAgainst.exalted"
    };

    // half : dégâts divisés par deux ; lowest : l'attaquant lance deux dés de dégâts et garde le plus bas
    static DAMAGE_REDUCTIONS = {
        none: "DANGEROUSGARY.Defence.DamageReduction.none",
        half: "DANGEROUSGARY.Defence.DamageReduction.half",
        lowest: "DANGEROUSGARY.Defence.DamageReduction.lowest"
    };

    /** @override */
    static LOCALIZATION_PREFIXES = ["DANGEROUSGARY.Encounter"];
}