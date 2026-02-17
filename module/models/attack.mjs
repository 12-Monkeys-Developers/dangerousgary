export default class DangerousGaryAttackData extends foundry.abstract.TypeDataModel {
    /** @override */
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            description: new fields.HTMLField({ required: false, blank: true, initial: "", textSearch: true }),
            damageFormula: new fields.StringField({ required: false, nullable: true }),
            blast: new fields.BooleanField({ required: true, nullable: false, initial: false })
        };
    }

    /** @override */
    static LOCALIZATION_PREFIXES = ["DANGEROUSGARY.Attack"];

    get isBlast() {
        return this.blast;
    }

    get hasDamage() {
        return !!this.damageFormula;
    }
}