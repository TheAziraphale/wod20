/* global Dialog, game, mergeObject */

import { MortalActorSheet } from "./mortal-actor-sheet.js";

import { rollDice } from "./roll-dice.js";
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {MortalActorSheet}
 */

export class GhoulActorSheet extends MortalActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["vtm5e", "sheet", "actor", "ghoul"],
      template: "systems/wod20/templates/actor/ghoul-sheet.html",
      width: 800,
      height: 700,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "stats",
        },
      ],
    });
  }

  /** @override */
  get template() {
    if (!game.user.isGM && this.actor.limited)
      return "systems/wod20/templates/actor/limited-sheet.html";
    return "systems/wod20/templates/actor/ghoul-sheet.html";
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();

    data.sheetType = `${game.i18n.localize("VTM5E.Ghoul")}`;

    // Prepare items.
    if (this.actor.data.type === "ghoul") {
      this._prepareItems(data);
    }

    return data;
  }

  /**
   * Organize and classify Disciplines for Vampire & Ghoul sheets.
   *
   * @param {Object} actorData The actor to prepare.
   * @return {undefined}
   * @override
   */
  _prepareItems(sheetData) {
    super._prepareItems(sheetData);
    const actorData = sheetData.actor;

    const disciplines = {
      abombwe: [],
      animalism: [],
      auspex: [],
      bardo: [],
      celerity: [],
      chimerstry:[],
      daimonion: [],
      dementation: [],
      dominate: [],
      flight: [],
      fortitude: [],
      melpominee: [],
      mytherceria: [],
      obeah: [],
      obfuscate: [],
      obtenebration: [],
      potence: [],
      presence: [],
      protean: [],
      quietus: [],
      sanguinus: [],
      serpentis: [],
      spiritus: [],
      temporis: [],
      thanatosis: [],
      valeren: [],
      vicissitude: [],
      visceratika: [],
      oblivion: [],
      rituals: [],
      ceremonies: [],
      thaumaturgy: [],
      necromancy: [],
    };

    // Iterate through items, allocating to containers
    for (const i of sheetData.items) {
      if (i.type === "power") {
        // Append to disciplines.
        if (i.data.discipline !== undefined) {
          // console.log("that's the discipline", i.data.discipline);
          disciplines[i.data.discipline].push(i);
          if (!this.actor.data.data.disciplines[i.data.discipline].visible) {
            this.actor.update({
              [`data.disciplines.${i.data.discipline}.visible`]: true,
            });
          }
        }
      }
    }

    // Assign and return
    actorData.disciplines_list = disciplines;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Make Discipline visible
    html.find(".discipline-create").click(this._onShowDiscipline.bind(this));

    // Make Discipline hidden
    html.find(".discipline-delete").click((ev) => {
      const data = $(ev.currentTarget)[0].dataset;

      console.log(this.actor.data)
      if(this.actor.data.data.disciplines[data.discipline]?.isCustom) {
        delete this.actor.data.data.disciplines[data.discipline]
      } else {
        this.actor.update({
          [`data.disciplines.${data.discipline}.visible`]: false,
        });
      }
    });

    // Rollable Vampire/Ghouls powers
    html.find(".power-rollable").click(this._onVampireRoll.bind(this));
  }

  /**
   * Handle making a discipline visible
   * @param {Event} event   The originating click event
   * @private
   */
  _onShowDiscipline(event) {
    event.preventDefault();
    let options = "";
    for (const [key, value] of Object.entries(
      this.actor.data.data.disciplines
    )) {
      let localizedName = game.i18n.localize(value.name)
      if(value.isCustom) {
        localizedName = value.name
      }
      options = options.concat(
        `<option value="${key}">${localizedName}</option>`
      );
    }
    options += `<option value="custom-discipline">${game.i18n.localize('VTM5E.CustomDiscipline')}</option>`

    const template = 'systems/wod20/templates/dialogs/add-discipline.html'

    let buttons = {};
    buttons = {
      draw: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("VTM5E.Add"),
        callback: async (html) => {
          const discipline = html.find("#disciplineSelect")[0].value;
          if(true || discipline === 'custom-discipline') {
            const randomKey = this._makeid(10)
            this.actor.data.data.disciplines[randomKey] = {
              name: "Unknown discipline",
              power:[],
              value: 0,
              visible: true,
              isCustom: true,
            }
            this.actor.update({[`data.disciplines.${randomKey}.name`]: "Unknown discipline"})
            this.actor.update({[`data.disciplines.${randomKey}.power`]: []})
            this.actor.update({[`data.disciplines.${randomKey}.value`]: 0})
            this.actor.update({[`data.disciplines.${randomKey}.visible`]: true})
            this.actor.update({[`data.disciplines.${randomKey}.isCustom`]: true})

            console.log(discipline)
            console.log(this.actor)
            console.log(this.actor.data)
          } else {
            this.actor.update({
              [`data.disciplines.${discipline}.visible`]: true,
            });
          }
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("VTM5E.Cancel"),
      },
    };

    super._onRenderDialog(template, {options}, game.i18n.localize("VTM5E.AddDiscipline"), buttons)    
  }

  _makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
      charactersLength));
   }
   return result;
}

  _onVampireRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const item = this.actor.items.get(dataset.id);
    const disciplineValue = this.actor.data.data.disciplines[item.data.data.discipline].value;

    const dice1 =
      item.data.data.dice1 === "discipline"
        ? disciplineValue
        : (this.actor.data.data.abilities[item.data.data.dice1]?.value !== undefined ? this.actor.data.data.abilities[item.data.data.dice1].value : 0) + 
        (this.actor.data.data.abilities[item.data.data.dice1]?.buff !== undefined ? this.actor.data.data.abilities[item.data.data.dice1].buff : 0)

    let dice2;
    if (item.data.data.dice2 === "discipline") {
      dice2 = disciplineValue;
    } else if (item.data.data.skill) {
      dice2 = (this.actor.data.data.skills[item.data.data.dice2]?.value !== undefined ? this.actor.data.data.skills[item.data.data.dice2].value : 0);
    } else {
      dice2 = (this.actor.data.data.abilities[item.data.data.dice2]?.value !== undefined ? this.actor.data.data.abilities[item.data.data.dice2].value : 0) + 
      (this.actor.data.data.abilities[item.data.data.dice2]?.buff !== undefined ? this.actor.data.data.abilities[item.data.data.dice2].buff : 0)
    }

    const dicePool = dice1 + dice2;
    const difficulty = item.data.data.difficulty ? parseInt(item.data.data.difficulty) : 6
    rollDice(dicePool, this.actor, `${item.data.name}`, Number.isNaN(difficulty) ? 6 : difficulty, false, this.actor.data.data.health.state, item.data.data.applywounds);
  }
}
