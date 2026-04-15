// src/systems/TimeSystem.ts
import { gameState } from './GameState';
import {
  DAY_MS, DAYS_PER_MONTH, WATER_REGEN_MS, TICK_MS,
  WELL_PASSIVE_INTERVAL, WELL_PASSIVE_AMOUNT,
  WOOD_PASSIVE_INTERVAL, WOOD_PASSIVE_AMOUNT,
  FARMER_HARVEST_MS, OUVRIER_PROD_MS,
} from '../utils/constants';
import { CROPS } from '../data/crops';
import { TREES } from '../data/trees';
import { ANIMALS, ANIMAL_FEED } from '../data/animals';
import { ATELIERS } from '../data/ateliers';
import { getDebtRate, getSavingsRate } from '../data/upgrades';

export class TimeSystem {
  private scene: Phaser.Scene;
  private tickTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  start(): void {
    this.tickTimer = this.scene.time.addEvent({
      delay: TICK_MS,
      callback: this.tick,
      callbackScope: this,
      loop: true,
    });
  }

  stop(): void {
    this.tickTimer?.destroy();
  }

  private tick(): void {
    const now = Date.now();
    const state = gameState.data;

    // ===== Water regen: +1 every 30s =====
    const waterGain = Math.floor((now - state.lastWaterRegen) / WATER_REGEN_MS);
    if (waterGain > 0) {
      state.water = Math.min(state.maxWater, state.water + waterGain);
      state.lastWaterRegen += waterGain * WATER_REGEN_MS;
    }

    // ===== Well passive water =====
    // Only accumulate when water <= maxWater (matches original)
    if (gameState.isWellOperational() && state.water <= state.maxWater) {
      const wellGain = Math.floor((now - state.lastWellTick) / WELL_PASSIVE_INTERVAL);
      if (wellGain > 0) {
        state.wellWater += wellGain * WELL_PASSIVE_AMOUNT;
        state.lastWellTick += wellGain * WELL_PASSIVE_INTERVAL;
      }
    }

    // ===== Wood passive =====
    if (gameState.isWoodOperational()) {
      const woodGain = Math.floor((now - state.lastWoodTick) / WOOD_PASSIVE_INTERVAL);
      if (woodGain > 0) {
        state.woodStock += woodGain * WOOD_PASSIVE_AMOUNT;
        state.lastWoodTick += woodGain * WOOD_PASSIVE_INTERVAL;
      }
    }

    // ===== Day/Month progression =====
    const daysPassed = Math.floor((now - state.lastDayTick) / DAY_MS);
    if (daysPassed > 0) {
      state.lastDayTick += daysPassed * DAY_MS;
      const totalDays = state.day + daysPassed - 1;
      const monthsPassed = Math.floor(totalDays / DAYS_PER_MONTH);
      state.day = (totalDays % DAYS_PER_MONTH) + 1;

      if (monthsPassed > 0) {
        state.month += monthsPassed;

        for (let m = 0; m < monthsPassed; m++) {
          // Savings interest
          const savRate = getSavingsRate(gameState.getUpgrade('savingsrate'));
          if (savRate > 0 && state.savings > 0) {
            state.savings += Math.floor(state.savings * savRate);
          }

          // Debt interest
          if (state.debt > 0) {
            const rate = getDebtRate(state.debt);
            state.debt += Math.ceil(state.debt * rate);
          }

          // Pay rent
          const rent = gameState.getRent();
          if (state.coins >= rent) {
            state.coins -= rent;
          } else {
            state.debt += (rent - state.coins);
            state.coins = 0;
          }

          // Garden monthly rewards
          gameState.processGardenRewards();
        }

        // Regenerate quests & trades for new month
        gameState.generateQuests();
        gameState.generateTrades();
      }
    }

    // ===== Auto-water =====
    if (gameState.getUpgrade('autowater') >= 1 && state.autoWaterEnd > now) {
      for (const plot of state.plots) {
        if (plot.catIdx < 0 || plot.locked) continue;
        if (gameState.isMature(plot)) continue;
        if (!gameState.isReadyToWater(plot)) continue;
        if (state.water <= 0) break;
        state.water--;
        plot.waterCount++;
        plot.lastWater = now;
      }
    }

    // ===== Auto-harvest =====
    if (gameState.getUpgrade('autoharvest') >= 1 && state.autoHarvestEnd > now) {
      for (const plot of state.plots) {
        if (plot.catIdx < 0 || plot.locked) continue;
        if (!gameState.isMature(plot)) continue;
        const item = plot.catIdx === 0 ? CROPS[plot.itemIdx] : TREES[plot.itemIdx];
        if (!item) continue;
        const sv = gameState.getSellValue(plot.catIdx, plot.itemIdx);
        state.coins += sv;
        state.xp += item.xp;
        state.totalEarned += sv;
        state.totalHarvested++;
        if (item.resourceKey) {
          gameState.addResource(item.resourceKey, 1);
        }
        if (plot.catIdx === 1) {
          gameState.addResource('bois', 1);
        }
        // Track quest
        gameState.trackQuestHarvest(item.name);
        plot.catIdx = -1;
        plot.itemIdx = -1;
        plot.waterCount = 0;
        plot.lastWater = 0;
      }
      gameState.checkLevelUp();
    }

    // ===== Auto-atelier =====
    if (gameState.getUpgrade('autoatelier') >= 1 && state.autoAtelierEnd > now) {
      for (let i = 0; i < state.atelierSlots.length; i++) {
        if (gameState.isCraftDone(i)) {
          const slot = state.atelierSlots[i];
          const atelier = ATELIERS[slot.atelierIdx];
          const recipe = atelier?.recipes[slot.craftRecipeIdx];
          if (recipe) gameState.trackQuestRecipe(recipe.name, slot.craftQty);
          gameState.collectCraft(i);
        }
      }
      gameState.checkLevelUp();
    }

    // ===== Auto-feed animals =====
    if (gameState.getUpgrade('autofeed') >= 1 && state.autoFeedEnd > now) {
      for (let i = 0; i < state.animalSlots.length; i++) {
        const slot = state.animalSlots[i];
        if (slot.locked || slot.animalIdx < 0 || !slot.autoFeed) continue;

        // If production is done, collect
        if (slot.fed) {
          const prodTime = gameState.getAnimalProdTimeMs(slot.animalIdx);
          if (now - slot.prodStart >= prodTime) {
            const af = ANIMAL_FEED[slot.animalIdx];
            const qty = gameState.getAnimalProdQty();
            if (af?.outputResource) gameState.trackQuestAnimalRes(af.outputResource, qty);
            gameState.collectAnimal(i);
          }
        }

        // If idle, feed
        if (!slot.fed) {
          gameState.feedAnimal(i);
        }
      }
      gameState.checkLevelUp();
    }

    // ===== Fermiers production =====
    for (const farmer of state.farmers) {
      if (farmer.assignment === 'repos') continue;
      if (now - farmer.lastProd >= FARMER_HARVEST_MS) {
        farmer.lastProd = now;
        const qty = farmer.level;
        gameState.addResource(farmer.assignment, qty);
      }
    }

    // ===== Ouvriers production =====
    for (const ouvrier of state.ouvriers) {
      if (ouvrier.assignment === 'repos') continue;
      if (now - ouvrier.lastProd >= OUVRIER_PROD_MS) {
        // Parse assignment "atelierIdx:recipeIdx"
        const parts = ouvrier.assignment.split(':');
        if (parts.length !== 2) continue;
        const ai = parseInt(parts[0], 10);
        const ri = parseInt(parts[1], 10);
        const atelier = ATELIERS[ai];
        if (!atelier) continue;
        const recipe = atelier.recipes[ri];
        if (!recipe || !recipe.output) continue;

        const qty = ouvrier.level;
        // Check if resources available
        if (gameState.hasResources(recipe.inputs, qty)) {
          gameState.consumeResources(recipe.inputs, qty);
          gameState.addResource(recipe.output, qty);
          ouvrier.lastProd = now;
        }
        // If not enough resources, skip this cycle
      }
    }

    gameState.emit();
  }
}
