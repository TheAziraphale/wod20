/* global DEFAULT_TOKEN, Dialog, duplicate, game, mergeObject */

// Export this function to be used in other scripts
import { CoterieActorSheet } from "./coterie-actor-sheet.js";
import { rollDice } from "./roll-dice.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {CoterieActorSheet}
 */

export class MortalActorSheet extends CoterieActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["vtm5e", "sheet", "actor", "mortal"],
      template: "systems/wod20/templates/actor/mortal-sheet.html",
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

  constructor(actor, options) {
    super(actor, options);
    this.isCharacter = true;
    this.hunger = false;
  }

  /** @override */
  get template() {
    if (!game.user.isGM && this.actor.limited)
      return "systems/wod20/templates/actor/limited-sheet.html";
    return "systems/wod20/templates/actor/mortal-sheet.html";
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    // TODO: confirm that I can finish and use this list
    data.sheetType = `${game.i18n.localize("VTM5E.Mortal")}`;

    // Prepare items.
    if (this.actor.data.type === "mortal") {
      this._prepareItems(data);
    }

    return data;
  }

  /**
   * Organize and classify Items for all sheets.
   *
   * @param {Object} actorData The actor to prepare.
   * @return {undefined}
   * @override
   */
  _prepareItems(sheetData) {
    super._prepareItems(sheetData);
    const actorData = sheetData.actor;

    // Initialize containers.
    const specialties = [];
    const boons = [];
    const customRolls = [];

    // Iterate through items, allocating to containers
    for (const i of sheetData.items) {
      i.img = i.img || DEFAULT_TOKEN;
      if (i.type === "specialty") {
        // Append to specialties.
        specialties.push(i);
      } else if (i.type === "boon") {
        // Append to boons.
        boons.push(i);
      } else if (i.type === "customRoll") {
        // Append to custom rolls.
        customRolls.push(i);
      }
    }
    // Assign and return
    actorData.specialties = specialties;
    actorData.boons = boons;
    actorData.customRolls = customRolls;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    this._setupDotCounters(html);
    this._setupSquareCounters(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Ressource squares (Health, Willpower)
    html
      .find(".resource-counter > .resource-counter-step")
      .click(this._onSquareCounterChange.bind(this));
    html.find(".resource-plus").click(this._onResourceChange.bind(this));
    html.find(".resource-minus").click(this._onResourceChange.bind(this));

    // Rollable abilities.
    html.find(".rollable").click(this._onRoll.bind(this));
    html.find(".custom-rollable").click(this._onCustomVampireRoll.bind(this));
    html
      .find(".specialty-rollable")
      .click(this._onCustomVampireRoll.bind(this));
    // Rollable abilities.
    html.find(".vrollable").click(this._onRollDialog.bind(this));
  }
  
  /**   * Handle clickable Vampire rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollDialog(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    let options = "";
    for (const [key, value] of Object.entries(this.actor.data.data.skills)) {
        options = options.concat(
          `<option value="${key}">${game.i18n.localize(value.name)}</option>`
          );
        }
    let attributesOptions = "";
    for (const [key, value] of Object.entries(this.actor.data.data.abilities)) {
        options = options.concat(
          `<option value="${key}">${game.i18n.localize(value.name)}</option>`
          );
        }
    let healthOptions = ""
    for (const [key, value] of Object.entries(this.actor.data.data.woundPenalties)) {
          healthOptions = healthOptions.concat(
            `<option value="${key}">${game.i18n.localize(value.name)}</option>`
            );
    }
    let wounded;
    let specialty;
    let selectAbility;
    let selectAttributes;
    let applyWounds;

    //    If rolling Rötschreck, the pop up won't have any select Ability 
    if (dataset.noability=="true") {
      selectAbility =  ``
      selectAttributes = ``
      specialty =  ``
      wounded = ``
      applyWounds = ``
    } else {
      console.log(dataset)
      console.log("dataset.ability", dataset.ability)
      console.log("dataset.label", dataset.label)
      console.log(dataset.ability=="true")
      console.log(dataset.ability === "true")
      if (dataset.ability=="true") {
        console.log("inside")
        selectAbility =  `<div class="form-group">
                            <label>${game.i18n.localize("VTM5E.SelectAbility")}</label>
                            <select id="abilitySelect">${options}</select>
                          </div>`;
        selectAttributes = ``;
      } else {
        console.log("inside2")
        selectAttributes =  `<div class="form-group">
                        <label>${game.i18n.localize("VTM5E.SelectAttributes")}</label>
                        <select id="attributesSelect">${attributesOptions}</select>
                      </div>`;
        selectAbility = ``;
      }
      specialty =  `<input id="specialty" type="checkbox"> Specialty </input>`
      wounded = `<div class="form-group">
                  <label>${game.i18n.localize("VTM5E.SelectWound")}</label>
                  <select id="woundSelect">${healthOptions}</select>
                </div>`
      applyWounds =  `<input id="applyWound" type="checkbox">Apply wounds </input>`
    }

    const template = 'systems/wod20/templates/dialogs/custom-roll.html'

    let buttons = {};
    buttons = {
      
      draw: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("VTM5E.Roll"),
        callback: async (html) => {
          const ability = html.find("#abilitySelect")[0]?.value
          const abilityVal = !ability || ability === 'null'|| ability === ''  ? 0 : 
            this.actor.data.data.skills[ability]?.value + (this.actor.data.data.skills[ability]?.buff ? 
            this.actor.data.data.skills[ability]?.buff : 
          0);
          const attributes = html.find("#attributesSelect")[0]?.value
          const attributesVal = !attributes || attributes === 'null' || attributes === '' ? 0 : 
            this.actor.data.data.abilities[attributes]?.value + (this.actor.data.data.abilities[attributes]?.buff ? 
            this.actor.data.data.abilities[attributes]?.buff : 
          0);

          const actorsOwnBuff = attributes && this.actor.data.data.abilities[dataset.label.toLowerCase()]?.buff ? this.actor.data.data.abilities[dataset.label.toLowerCase()]?.buff : 0
          const name = attributes ? game.i18n.localize(this.actor.data.data.abilities[attributes]?.name) : game.i18n.localize(this.actor.data.data.skills[ability]?.name)
          const modifier = parseInt(html.find("#inputMod")[0].value || 0)
          const difficulty = parseInt(html.find("#inputDif")[0].value || 6)
          const specialty = html.find("#specialty")[0]?.checked || false
          const applyWounds = html.find("#applyWounds")[0]?.checked || false
          const numDice = dataset.noability!=="true" ? abilityVal + attributesVal + parseInt(dataset.roll) + parseInt(actorsOwnBuff ? actorsOwnBuff : 0) + modifier : parseInt(dataset.roll) + modifier

          rollDice(
            numDice,
            this.actor,
            dataset.noability !== 'true'
              ? `${dataset.label} + ${name}`
              : `${dataset.label}`,
            difficulty,
            specialty,
            this.actor.data.data.health.state,
            applyWounds
          )
          // this._vampireRoll(numDice, this.actor, `${dataset.label} + ${abilityName}`, difficulty)
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize('VTM5E.Cancel')
      }
    }

    const abilities = Object.keys(this.actor.data.data.abilities)
    // console.log(abilities);
    renderTemplate(template, { noability: dataset.noability, rollingattributes: dataset.ability, abilities }).then((content) => {
      new Dialog({
        title: game.i18n.localize('VTM5E.Rolling') + ` ${dataset.label}...`,
        content,
        buttons: buttons,
        default: 'draw'
      }).render(true)
    })
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const useHunger = this.hunger && dataset.useHunger === "1";
    const numDice = dataset.roll;
    // console.log(dataset.roll);
    rollDice(numDice, this.actor, `${dataset.label}`, 6);
  }

  _onCustomVampireRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    if (dataset.dice1 === "") {
      const dice2 =
        this.actor.data.data.skills[dataset.dice2.toLowerCase()].value;
      dataset.roll = dice2 + 1; // specialty modifier
      dataset.label = dataset.name;
      this._onRollDialog(event);
    } else {
      const dice1 =
        this.actor.data.data.abilities[dataset.dice1.toLowerCase()].value;
      const dice2 =
        this.actor.data.data.skills[dataset.dice2.toLowerCase()].value;
      const dicePool = dice1 + dice2;
      rollDice(dicePool, this.actor, `${dataset.name}`, 6);
    }
  }

  _onSquareCounterChange(event) {

    event.preventDefault();
    const element = event.currentTarget;
    const index = Number(element.dataset.index);
    const oldState = element.dataset.state || "";
    const parent = $(element.parentNode);
    const data = parent[0].dataset;
    const states = parseCounterStates(data.states);
    const fields = data.name.split(".");
    const steps = parent.find(".resource-counter-step");
    const humanity = data.name === "data.humanity";
    const fulls = Number(data[states["-"]]) || 0;
    const halfs = Number(data[states["/"]]) || 0;
    const crossed = Number(data[states.x]) || 0;
    const star = Number(data[states["*"]]) || 0;
    if (index < 0 || index > steps.length) {
      return;
    }
  
    const allStates = ["", ...Object.keys(states)];
    const currentState = allStates.indexOf(oldState);
    if (currentState < 0) {
      return;
    }
    // console.log(currentState)
    const newState = allStates[(currentState + 1) % allStates.length];
    steps[index].dataset.state = newState;

    if (
      (oldState !== "" && oldState !== "-") ||
      (oldState !== "" && humanity)
    ) {
      data[states[oldState]] = Number(data[states[oldState]]) - 1;
    }

    // If the step was removed we also need to subtract from the maximum.
    if (oldState !== "" && newState === "" && !humanity) {
      data[states["-"]] = Number(data[states["-"]]) - 1;
    }

    if (newState !== "") {
      data[states[newState]] =
        Number(data[states[newState]]) +
        Math.max(index + 1 - fulls - halfs - crossed, 1);
    }

    const newValue = Object.values(states).reduce(function (obj, k) {
      obj[k] = Number(data[k]) || 0;
      return obj;
    }, {});
    this._assignToActorField(fields, newValue);
  }

  _setupSquareCounters(html) {
    html.find(".resource-counter").each(function () {
      const data = this.dataset;
      const states = parseCounterStates(data.states);
      const humanity = data.name === "data.humanity";

      const fulls = Number(data[states["-"]]) || 0;
      const halfs = Number(data[states["/"]]) || 0;
      const crossed = Number(data[states.x]) || 0;

      const values = humanity
        ? new Array(fulls + halfs)
        : new Array(halfs + crossed + fulls );

      if (humanity) {
        values.fill("-", 0, fulls);
        values.fill("/", fulls, fulls + halfs);
      } else {
        values.fill("/", 0, halfs);
        values.fill("-", halfs, halfs + fulls )
        values.fill("x", halfs + fulls, halfs + fulls + crossed);

      }

      $(this)
        .find(".resource-counter-step")
        .each(function () {
          this.dataset.state = "";
          if (this.dataset.index < values.length) {
            this.dataset.state = values[this.dataset.index];
          }
        });
    });
    
 
  }

  _onResourceChange(event) {
    event.preventDefault();
    const actorData = duplicate(this.actor);
    const element = event.currentTarget;
    const dataset = element.dataset;
    const resource = dataset.resource;
    if (dataset.action === "plus") {
      actorData.data[resource].max++;
    } else if (dataset.action === "minus") {
      actorData.data[resource].max = Math.max(
        actorData.data[resource].max - 1,
        0
      );
    }

    if (
      actorData.data[resource].aggravated +
        actorData.data[resource].superficial >
      actorData.data[resource].max
    ) {
      actorData.data[resource].aggravated =
        actorData.data[resource].max - actorData.data[resource].superficial;
      if (actorData.data[resource].aggravated <= 0) {
        actorData.data[resource].aggravated = 0;
        actorData.data[resource].superficial = actorData.data[resource].max;
      }
    }
    this.actor.update(actorData);
  }
}

function parseCounterStates(states) {
  return states.split(",").reduce((obj, state) => {
    const [k, v] = state.split(":");
    obj[k] = v;
    return obj;
  }, {});
}
