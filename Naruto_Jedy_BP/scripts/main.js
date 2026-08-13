// ============================================================
//  Naruto Jedy Addon — Script API
//  Jutsus, armas arremessáveis, habilidades, NPCs (loja +
//  contratação), sistema de nível e chakra, kit inicial.
//  Requer Minecraft Bedrock 1.26.33+ (@minecraft/server 2.x)
// ============================================================
import {
  world,
  system,
  EquipmentSlot,
  EntityDamageCause,
  GameMode,
  ItemStack,
} from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// ------------------------------------------------------------
//  Sistema de nível e chakra (dados salvos por jogador)
// ------------------------------------------------------------
const LEVEL_KEY = "naruto:level";
const XP_KEY = "naruto:xp";
const CHAKRA_KEY = "naruto:chakra";
const STARTER_KEY = "naruto:starter_given";

const xpToNext = (level) => 100 + (level - 1) * 50;
const maxChakra = (level) => 100 + (level - 1) * 10;

function getLevel(player) {
  return player.getDynamicProperty(LEVEL_KEY) ?? 1;
}
function getXp(player) {
  return player.getDynamicProperty(XP_KEY) ?? 0;
}
function getChakra(player) {
  const max = maxChakra(getLevel(player));
  return Math.min(player.getDynamicProperty(CHAKRA_KEY) ?? max, max);
}

function addXp(player, amount) {
  let level = getLevel(player);
  let xp = getXp(player) + amount;
  let leveledUp = false;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    leveledUp = true;
  }
  player.setDynamicProperty(LEVEL_KEY, level);
  player.setDynamicProperty(XP_KEY, xp);
  if (leveledUp) {
    player.playSound("random.levelup");
    player.onScreenDisplay.setTitle(`§6§lNÍVEL ${level}!`, {
      fadeInDuration: 5,
      stayDuration: 40,
      fadeOutDuration: 10,
      subtitle: `§eChakra máximo agora é ${maxChakra(level)}!`,
    });
    player.addEffect("absorption", 400, { amplifier: 1, showParticles: true });
    player.addEffect("speed", 200, { amplifier: 0, showParticles: false });
  }
}

/** Gasta chakra do jogador. Retorna false se não houver o suficiente. */
function spendChakra(player, amount) {
  const current = getChakra(player);
  if (current < amount) {
    player.sendMessage("§c✖ Chakra insuficiente! (precisa de " + amount + ")");
    return false;
  }
  player.setDynamicProperty(CHAKRA_KEY, current - amount);
  return true;
}

/** Gate de nível para habilidades mais fortes. */
function requireLevel(player, level) {
  if (getLevel(player) < level) {
    player.sendMessage(`§cEste jutsu requer nível ${level}!`);
    return false;
  }
  return true;
}

// XP concedido ao matar cada criatura (padrão: 5)
const XP_VALUES = {
  "minecraft:zombie": 8,
  "minecraft:husk": 8,
  "minecraft:drowned": 8,
  "minecraft:skeleton": 8,
  "minecraft:stray": 8,
  "minecraft:spider": 8,
  "minecraft:cave_spider": 10,
  "minecraft:creeper": 15,
  "minecraft:enderman": 20,
  "minecraft:slime": 4,
  "minecraft:silverfish": 3,
  "minecraft:phantom": 15,
  "minecraft:witch": 20,
  "minecraft:blaze": 25,
  "minecraft:shulker": 20,
  "minecraft:guardian": 20,
  "minecraft:elder_guardian": 60,
  "minecraft:ravager": 30,
  "minecraft:vindicator": 20,
  "minecraft:pillager": 15,
  "minecraft:evoker": 30,
  "minecraft:wither_skeleton": 30,
  "minecraft:hoglin": 15,
  "minecraft:zoglin": 15,
  "minecraft:piglin": 8,
  "minecraft:piglin_brute": 25,
  "minecraft:warden": 80,
  "naruto:rogue_ninja": 30,
  "naruto:shadow_clone": 0,
};

// ------------------------------------------------------------
//  Inventário (moeda = esmeralda)
// ------------------------------------------------------------

function countItem(player, typeId) {
  const container = player.getComponent("minecraft:inventory")?.container;
  if (!container) return 0;
  let count = 0;
  for (let i = 0; i < container.size; i++) {
    const item = container.getSlot(i).getItem();
    if (item && item.typeId === typeId) count += item.amount;
  }
  return count;
}

function takeItems(player, typeId, count) {
  const container = player.getComponent("minecraft:inventory")?.container;
  if (!container) return false;
  let remaining = count;
  for (let i = 0; i < container.size; i++) {
    const slot = container.getSlot(i);
    const item = slot.getItem();
    if (!item || item.typeId !== typeId) continue;
    const take = Math.min(item.amount, remaining);
    item.amount -= take;
    remaining -= take;
    slot.setItem(item.amount > 0 ? item : undefined);
    if (remaining <= 0) return true;
  }
  return false;
}

function giveItem(player, itemStack) {
  const container = player.getComponent("minecraft:inventory")?.container;
  if (container) container.addItem(itemStack);
}

// ------------------------------------------------------------
//  Utilitários
// ------------------------------------------------------------

/** Remove um item da mão principal (não consome no criativo). */
function consumeItem(source) {
  if (source.getGameMode() === GameMode.creative) return;
  const equippable = source.getComponent("minecraft:equippable");
  if (!equippable) return;
  const slot = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
  const item = slot.getItem();
  if (!item) return;
  item.amount -= 1;
  slot.setItem(item.amount > 0 ? item : undefined);
}

/**
 * Lança um projétil a partir da cabeça do jogador, na direção do olhar.
 * @param {number} count   quantidade de projéteis (ex: shuriken tripla)
 * @param {number} spread  abertura angular entre projéteis (radianos)
 */
function shootProjectile(source, projectileId, speed, count = 1, spread = 0) {
  const view = source.getViewDirection();
  const head = source.getHeadLocation();
  const base = {
    x: head.x + view.x * 0.5,
    y: head.y + view.y * 0.5 - 0.15,
    z: head.z + view.z * 0.5,
  };
  for (let i = 0; i < count; i++) {
    const angle = (i - (count - 1) / 2) * spread;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const vel = {
      x: view.x * cos + view.z * sin,
      y: view.y,
      z: view.z * cos - view.x * sin,
    };
    const entity = source.dimension.spawnEntity(projectileId, base);
    const projectile = entity.getComponent("minecraft:projectile");
    const velocity = { x: vel.x * speed, y: vel.y * speed, z: vel.z * speed };
    if (projectile && typeof projectile.shoot === "function") {
      projectile.shoot(velocity);
    } else {
      entity.setVelocity(velocity);
    }
  }
}

/** Explosão de partículas em volta de um ponto. */
function spawnBurst(dimension, location, particle, count, radius) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    const r = radius * Math.sqrt(Math.random());
    dimension.spawnParticle(particle, {
      x: location.x + Math.cos(a) * Math.sin(b) * r,
      y: location.y + Math.cos(b) * r,
      z: location.z + Math.sin(a) * Math.sin(b) * r,
    });
  }
}

// ------------------------------------------------------------
//  Componentes customizados dos itens (com custo de chakra)
// ------------------------------------------------------------

const throwKunai = {
  onUse(eventData) {
    const { source } = eventData;
    if (!spendChakra(source, 4)) return;
    shootProjectile(source, "naruto:kunai_projectile", 2.2);
    consumeItem(source);
    addXp(source, 1);
  },
};

const throwShuriken = {
  onUse(eventData) {
    const { source } = eventData;
    if (!spendChakra(source, 6)) return;
    shootProjectile(source, "naruto:shuriken_projectile", 2.6, 3, 0.14);
    consumeItem(source);
    addXp(source, 1);
  },
};

const throwExplosiveKunai = {
  onUse(eventData) {
    const { source } = eventData;
    if (!spendChakra(source, 8)) return;
    shootProjectile(source, "naruto:explosive_kunai_projectile", 1.8);
    consumeItem(source);
    addXp(source, 1);
  },
};

const throwFumaShuriken = {
  onUse(eventData) {
    const { source } = eventData;
    if (!spendChakra(source, 12)) return;
    shootProjectile(source, "naruto:fuma_shuriken_projectile", 2.4);
    consumeItem(source);
    addXp(source, 1);
  },
};

const rasengan = {
  onUse(eventData) {
    const { source } = eventData;
    if (!spendChakra(source, 30)) return;
    const dimension = source.dimension;
    const loc = source.location;
    const damage = 10 + Math.floor(getLevel(source) / 4);
    // Onda de choque sem destruir o cenário.
    dimension.createExplosion(
      { x: loc.x, y: loc.y + 0.4, z: loc.z },
      2.5,
      { breaksBlocks: false, causesFire: false }
    );
    const targets = dimension
      .getEntities({ location: loc, maxDistance: 6 })
      .filter((entity) => entity.id !== source.id);
    for (const target of targets) {
      target.applyDamage(damage, { cause: EntityDamageCause.explosion });
    }
    spawnBurst(
      dimension,
      { x: loc.x, y: loc.y + 0.6, z: loc.z },
      "minecraft:basic_flame_particle",
      30,
      3.5
    );
    addXp(source, 2);
  },
};

const chidori = {
  onUse(eventData) {
    const { source } = eventData;
    if (!spendChakra(source, 40)) return;
    const dimension = source.dimension;
    const loc = source.location;
    const damage = 7 + Math.floor(getLevel(source) / 4);
    const targets = dimension
      .getEntities({ location: loc, maxDistance: 5.5 })
      .filter((entity) => entity.id !== source.id);
    for (const target of targets) {
      target.applyDamage(damage, { cause: EntityDamageCause.magic });
    }
    source.addEffect("speed", 100, { amplifier: 1, showParticles: false });
    spawnBurst(
      dimension,
      { x: loc.x, y: loc.y + 0.8, z: loc.z },
      "minecraft:electric_spark_particle",
      22,
      4
    );
    addXp(source, 2);
  },
};

const katon = {
  onUse(eventData) {
    const { source } = eventData;
    if (!spendChakra(source, 25)) return;
    const dimension = source.dimension;
    const loc = source.location;
    const targets = dimension
      .getEntities({ location: loc, maxDistance: 5 })
      .filter((entity) => entity.id !== source.id);
    for (const target of targets) {
      target.applyDamage(8, { cause: EntityDamageCause.fire });
      target.setOnFire(4, false);
    }
    spawnBurst(
      dimension,
      { x: loc.x, y: loc.y + 0.6, z: loc.z },
      "minecraft:basic_flame_particle",
      40,
      4
    );
    addXp(source, 2);
  },
};

const rasenshuriken = {
  onUse(eventData) {
    const { source } = eventData;
    if (!requireLevel(source, 5)) return;
    if (!spendChakra(source, 50)) return;
    const dimension = source.dimension;
    const loc = source.location;
    dimension.createExplosion(
      { x: loc.x, y: loc.y + 0.4, z: loc.z },
      3.5,
      { breaksBlocks: false, causesFire: false }
    );
    const targets = dimension
      .getEntities({ location: loc, maxDistance: 8 })
      .filter((entity) => entity.id !== source.id);
    for (const target of targets) {
      target.applyDamage(16, { cause: EntityDamageCause.explosion });
    }
    spawnBurst(
      dimension,
      { x: loc.x, y: loc.y + 0.6, z: loc.z },
      "minecraft:basic_flame_particle",
      45,
      5
    );
    addXp(source, 5);
  },
};

const kageBunshin = {
  onUse(eventData) {
    const { source } = eventData;
    if (!requireLevel(source, 3)) return;
    if (!spendChakra(source, 45)) return;
    const loc = source.location;
    for (let i = 0; i < 2; i++) {
      const offset = {
        x: loc.x + Math.cos(i * Math.PI) * 1.2,
        y: loc.y + 0.2,
        z: loc.z + Math.sin(i * Math.PI) * 1.2,
      };
      const clone = source.dimension.spawnEntity("naruto:shadow_clone", offset);
      clone.nameTag = "§bClone";
      const tameable = clone.getComponent("minecraft:tameable");
      if (tameable) tameable.tame(source);
      system.runTimeout(() => {
        if (clone.isValid()) clone.remove();
      }, 600); // 30 segundos
    }
    spawnBurst(source.dimension, { x: loc.x, y: loc.y + 0.6, z: loc.z }, "minecraft:basic_smoke_particle", 20, 2);
    source.sendMessage("§b💨 Clone das Sombras! 2 clones lutam ao seu lado por 30s.");
    addXp(source, 5);
  },
};

const sharingan = {
  onUse(eventData) {
    const { source } = eventData;
    if (!requireLevel(source, 2)) return;
    if (!spendChakra(source, 20)) return;
    source.addEffect("night_vision", 1200, { showParticles: false });
    source.addEffect("speed", 400, { amplifier: 1, showParticles: false });
    source.addEffect("jump_boost", 400, { amplifier: 0, showParticles: false });
    source.sendMessage("§c👁 Sharingan ativado! Visão noturna e reflexos aprimorados.");
    addXp(source, 2);
  },
};

const byakugan = {
  onUse(eventData) {
    const { source } = eventData;
    if (!requireLevel(source, 4)) return;
    if (!spendChakra(source, 25)) return;
    const dimension = source.dimension;
    const loc = source.location;
    const targets = dimension
      .getEntities({ location: loc, maxDistance: 30 })
      .filter(
        (entity) =>
          entity.id !== source.id &&
          entity.typeId !== "minecraft:item" &&
          entity.typeId !== "minecraft:xp_orb"
      );
    for (const target of targets) {
      target.addEffect("glowing", 400, { showParticles: false });
    }
    source.addEffect("night_vision", 1200, { showParticles: false });
    source.sendMessage("§f👁 Byakugan ativado! Você enxerga o chakra de todos ao redor.");
    addXp(source, 2);
  },
};

const chakraPill = {
  onUse(eventData) {
    const { source } = eventData;
    const max = maxChakra(getLevel(source));
    const current = getChakra(source);
    if (current >= max) {
      source.sendMessage("§b💊 Seu chakra já está cheio!");
      return;
    }
    const restored = Math.min(40, max - current);
    source.setDynamicProperty(CHAKRA_KEY, current + restored);
    source.playSound("random.orb");
    source.sendMessage(`§b💊 +${restored} chakra! (${current + restored}/${max})`);
    consumeItem(source);
  },
};

const trainingScroll = {
  onUse(eventData) {
    const { source } = eventData;
    addXp(source, 50);
    source.playSound("random.orb");
    source.sendMessage("§6📜 +50 XP! Continue treinando!");
    consumeItem(source);
  },
};

// ------------------------------------------------------------
//  NPC: Mestre Ninja (menu interativo + contratação)
// ------------------------------------------------------------

const NINJA_NAMES = [
  "Ryu", "Kaze", "Hikari", "Takeshi", "Akira", "Sora",
  "Yuki", "Daichi", "Haru", "Ren", "Kaito", "Mizu",
];

function openSenseiMenu(player, sensei) {
  const level = getLevel(player);
  const tameable = sensei.getComponent("minecraft:tameable");
  const alreadyHired = tameable && tameable.tamedPlayer ? true : false;

  const form = new ActionFormData()
    .title("§6🍥 Mestre Ninja")
    .body(
      "§7O Mestre te observa com atenção...\n\n" +
        `§fNível: §6${level}\n` +
        `§fChakra: §b${getChakra(player)}/${maxChakra(level)}\n` +
        `§fXP: §e${getXp(player)}/${xpToNext(level)}\n` +
        `§fEsmeraldas: §e${countItem(player, "minecraft:emerald")}\n\n` +
        "§7O que deseja, jovem ninja?"
    )
    .button("§6🎓 Treinar Jutsu\n§7§o-30 chakra · +25 XP")
    .button("§a💚 Curar Ferimentos\n§7§oDe graça!")
    .button(alreadyHired ? "§7(Companheiro contratado)" : "§d🤝 Contratar Ninja\n§7§oPreço aleatório")
    .button("§eℹ️ Sobre o nível e chakra");

  form.show(player).then((response) => {
    if (response.canceled) return;
    if (response.selection === 0) {
      if (spendChakra(player, 30)) {
        addXp(player, 25);
        player.sendMessage("§a[Sensei]§r Excelente! Seu treinamento rendeu §e+25 XP§r!");
      }
    } else if (response.selection === 1) {
      const health = player.getComponent("minecraft:health");
      if (health) health.setCurrentValue(health.effectiveMax);
      const hunger = player.getComponent("minecraft:player_hunger");
      if (hunger) hunger.value = 20;
      player.sendMessage("§a[Sensei]§r Você foi curado. Vá com tudo!");
    } else if (response.selection === 2) {
      if (alreadyHired) {
        player.sendMessage("§7[Sensei]§r Este ninja já é seu companheiro!");
      } else {
        hireNinja(player, sensei);
      }
    } else {
      player.sendMessage(
        "§e[Sensei]§r Derrote inimigos e use jutsus para ganhar XP. " +
          "Ao subir de nível seu chakra máximo aumenta, jutsus ficam mais fortes " +
          "e habilidades novas são desbloqueadas (Sharingan: nível 2, Clone: 3, Byakugan: 4, Rasenshuriken: 5).\n" +
          "§7Custos de chakra: Kunai §b4§7 · Shuriken §b6§7 · Rasengan §b30§7 · Chidori §b40§7."
      );
    }
  });
}

/** Contrata o ninja: preço aleatório, nome aleatório, vira companheiro. */
function hireNinja(player, sensei) {
  const price = 10 + Math.floor(Math.random() * 21); // 10–30 esmeraldas
  const form = new ActionFormData()
    .title("§d🤝 Contratar Ninja")
    .body(
      "§7Este ninja quer se juntar a você!\n\n" +
        `§fPreço: §e${price} esmeraldas\n` +
        `§fVocê tem: §e${countItem(player, "minecraft:emerald")}\n\n` +
        "§7Ele vai te seguir e lutar ao seu lado. Aceita?"
    )
    .button("§aAceitar")
    .button("§cRecusar");

  form.show(player).then((response) => {
    if (response.canceled || response.selection !== 0) return;
    if (countItem(player, "minecraft:emerald") < price) {
      player.sendMessage("§c[Sensei]§r Esmeraldas insuficientes! Volte quando tiver mais.");
      return;
    }
    takeItems(player, "minecraft:emerald", price);
    const name = NINJA_NAMES[Math.floor(Math.random() * NINJA_NAMES.length)];
    sensei.nameTag = "§e" + name + " §7· Seu Ninja";
    const tameable = sensei.getComponent("minecraft:tameable");
    if (tameable) tameable.tame(player);
    player.sendMessage(`§a${name}§r agora é seu companheiro! Ele te segue e luta ao seu lado.`);
    player.playSound("random.levelup");
  });
}

// ------------------------------------------------------------
//  NPC: Mercador Ninja (loja de compra e venda)
// ------------------------------------------------------------

const SHOP_WEAPONS = [
  { name: "§fKunai §7×8", item: "naruto:kunai", count: 8, price: 2 },
  { name: "§fShuriken §7×8", item: "naruto:shuriken", count: 8, price: 2 },
  { name: "§fKunai Explosiva §7×4", item: "naruto:explosive_kunai", count: 4, price: 4 },
  { name: "§fFuma Shuriken §7×4", item: "naruto:fuma_shuriken", count: 4, price: 5 },
  { name: "§fEspada Kusanagi", item: "naruto:kusanagi", count: 1, price: 15 },
];

const SHOP_JUTSUS = [
  { name: "§fKaton: Bola de Fogo", item: "naruto:katon", count: 1, price: 6 },
  { name: "§fRasengan", item: "naruto:rasengan", count: 1, price: 8 },
  { name: "§fChidori", item: "naruto:chidori", count: 1, price: 10 },
  { name: "§fSharingan", item: "naruto:sharingan", count: 1, price: 10 },
  { name: "§fClone das Sombras", item: "naruto:kage_bunshin", count: 1, price: 12 },
  { name: "§fByakugan", item: "naruto:byakugan", count: 1, price: 14 },
  { name: "§fRasenshuriken", item: "naruto:rasenshuriken", count: 1, price: 20 },
];

const SHOP_ITEMS = [
  { name: "§fRamen §7×4", item: "naruto:ramen", count: 4, price: 1 },
  { name: "§fPílula de Chakra", item: "naruto:chakra_pill", count: 1, price: 3 },
  { name: "§fPergaminho de Treino", item: "naruto:training_scroll", count: 1, price: 5 },
  { name: "§fTesteira de Konoha", item: "naruto:konoha_headband", count: 1, price: 12 },
  { name: "§fManto da Akatsuki", item: "naruto:akatsuki_cloak", count: 1, price: 20 },
];

const SELL_ITEMS = [
  { name: "§fLingote de Ferro §7×8", item: "minecraft:iron_ingot", count: 8, price: 1 },
  { name: "§fLápis-lazúli §7×8", item: "minecraft:lapis_lazuli", count: 8, price: 1 },
  { name: "§fDiamante §7×1", item: "minecraft:diamond", count: 1, price: 2 },
  { name: "§fKunai §7×8", item: "naruto:kunai", count: 8, price: 1 },
];

function openShopMenu(player) {
  const form = new ActionFormData()
    .title("§a💰 Loja Ninja")
    .body(
      "§7Bem-vindo à loja! Aceitamos §eEsmeraldas§7.\n" +
        `§fVocê tem: §e${countItem(player, "minecraft:emerald")}§f esmeraldas`
    )
    .button("§b🗡️ Armas")
    .button("§c🔥 Jutsus e Habilidades")
    .button("§6🧪 Itens e Consumíveis")
    .button("§d💰 Vender")
    .button("§eℹ️ Sobre a loja");
  form.show(player).then((response) => {
    if (response.canceled) return;
    if (response.selection === 0) showCategoryMenu(player, SHOP_WEAPONS, "Armas");
    else if (response.selection === 1) showCategoryMenu(player, SHOP_JUTSUS, "Jutsus e Habilidades");
    else if (response.selection === 2) showCategoryMenu(player, SHOP_ITEMS, "Itens e Consumíveis");
    else if (response.selection === 3) showSellMenu(player);
    else
      player.sendMessage(
        "§7[Loja]§r Compre e venda itens ninja usando esmeraldas. " +
          "Derrote monstros e venda seus recursos para ganhar dinheiro!"
      );
  });
}

function showCategoryMenu(player, entries, label) {
  const form = new ActionFormData()
    .title(`§b🛒 ${label}`)
    .body(`§7Você tem §e${countItem(player, "minecraft:emerald")}§7 esmeraldas.`);
  for (const entry of entries) {
    form.button(`${entry.name}\n§7§o${entry.price} esmeraldas`);
  }
  form.button("§c← Voltar");
  form.show(player).then((response) => {
    if (response.canceled) return;
    if (response.selection === entries.length) {
      openShopMenu(player);
      return;
    }
    buyItem(player, entries[response.selection]);
  });
}

function buyItem(player, entry) {
  if (countItem(player, "minecraft:emerald") < entry.price) {
    player.sendMessage(`§c[Loja]§r Esmeraldas insuficientes! (precisa de ${entry.price})`);
    return;
  }
  takeItems(player, "minecraft:emerald", entry.price);
  giveItem(player, new ItemStack(entry.item, entry.count));
  player.sendMessage(`§a[Loja]§r Comprado: ${entry.name} por ${entry.price} esmeralda(s).`);
}

function showSellMenu(player) {
  const form = new ActionFormData()
    .title("§d💰 Vender")
    .body("§7Entregue itens para ganhar esmeraldas.");
  for (const entry of SELL_ITEMS) {
    form.button(`${entry.name}\n§7§o+${entry.price} esmeralda(s)`);
  }
  form.button("§c← Voltar");
  form.show(player).then((response) => {
    if (response.canceled) return;
    if (response.selection === SELL_ITEMS.length) {
      openShopMenu(player);
      return;
    }
    sellItem(player, SELL_ITEMS[response.selection]);
  });
}

function sellItem(player, entry) {
  if (countItem(player, entry.item) < entry.count) {
    player.sendMessage(`§c[Loja]§r Você não tem itens suficientes para vender.`);
    return;
  }
  takeItems(player, entry.item, entry.count);
  giveItem(player, new ItemStack("minecraft:emerald", entry.price));
  player.sendMessage(`§a[Loja]§r Vendido: ${entry.name} por ${entry.price} esmeralda(s).`);
}

// ------------------------------------------------------------
//  Interação com NPCs
// ------------------------------------------------------------

world.afterEvents.playerInteractWithEntity.subscribe((event) => {
  const { player, target, itemStack } = event;
  const hasItem = itemStack && itemStack.typeId !== "minecraft:air";

  if (target.typeId === "naruto:ninja_sensei") {
    if (hasItem) {
      player.sendMessage("§e[Sensei]§r Coloque a mão vazia para falar comigo, ninja!");
      return;
    }
    openSenseiMenu(player, target);
  } else if (target.typeId === "naruto:shopkeeper") {
    if (hasItem) {
      player.sendMessage("§a[Loja]§r Coloque a mão vazia para negociar!");
      return;
    }
    openShopMenu(player);
  }
});

// ------------------------------------------------------------
//  Kit inicial aleatório (primeira entrada no mundo)
// ------------------------------------------------------------

world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  if (player.getDynamicProperty(STARTER_KEY)) return;
  player.setDynamicProperty(STARTER_KEY, true);

  const options = [
    new ItemStack("naruto:kunai", 5 + Math.floor(Math.random() * 6)),
    new ItemStack("naruto:shuriken", 5 + Math.floor(Math.random() * 6)),
    new ItemStack("naruto:ramen", 1 + Math.floor(Math.random() * 2)),
    new ItemStack("naruto:chakra_pill", 1),
  ];
  const amount = 1 + Math.floor(Math.random() * 2); // 1–2 itens aleatórios
  options.sort(() => Math.random() - 0.5);
  for (let i = 0; i < amount; i++) {
    giveItem(player, options[i]);
  }
  player.sendMessage("§6🍥 Bem-vindo, ninja! Você recebeu um kit inicial aleatório. Boa sorte!");
});

// ------------------------------------------------------------
//  XP ao matar criaturas
// ------------------------------------------------------------

world.afterEvents.entityDie.subscribe((event) => {
  const killer = event.damageSource.damagingEntity;
  if (!killer || killer.typeId !== "minecraft:player") return;
  const xp = XP_VALUES[event.deadEntity.typeId] ?? 5;
  addXp(killer, xp);
});

// ------------------------------------------------------------
//  Registro
// ------------------------------------------------------------

// Componentes customizados (disponível antes do mundo carregar)
world.beforeEvents.worldInitialize.subscribe((initEvent) => {
  const registry = initEvent.itemComponentRegistry;
  registry.registerCustomComponent("naruto:throw_kunai", throwKunai);
  registry.registerCustomComponent("naruto:throw_shuriken", throwShuriken);
  registry.registerCustomComponent("naruto:throw_explosive_kunai", throwExplosiveKunai);
  registry.registerCustomComponent("naruto:throw_fuma_shuriken", throwFumaShuriken);
  registry.registerCustomComponent("naruto:rasengan", rasengan);
  registry.registerCustomComponent("naruto:chidori", chidori);
  registry.registerCustomComponent("naruto:katon", katon);
  registry.registerCustomComponent("naruto:rasenshuriken", rasenshuriken);
  registry.registerCustomComponent("naruto:kage_bunshin", kageBunshin);
  registry.registerCustomComponent("naruto:sharingan", sharingan);
  registry.registerCustomComponent("naruto:byakugan", byakugan);
  registry.registerCustomComponent("naruto:chakra_pill", chakraPill);
  registry.registerCustomComponent("naruto:training_scroll", trainingScroll);
});

// Na Script API 2.x o script executa antes do mundo carregar:
// o HUD (que toca o mundo) só inicia depois do worldLoad.
world.afterEvents.worldLoad.subscribe(() => {
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      const level = getLevel(player);
      const max = maxChakra(level);
      const chakra = getChakra(player);
      if (chakra < max) {
        player.setDynamicProperty(CHAKRA_KEY, Math.min(max, chakra + 3));
      }
      const xp = getXp(player);
      const needed = xpToNext(level);
      const ratio = Math.max(0, Math.min(1, xp / needed));
      const filled = Math.round(ratio * 10);
      const bar = "█".repeat(filled) + "░".repeat(10 - filled);
      player.onScreenDisplay.setActionBar(
        `§6🍥 Nível ${level} §7[§f${bar}§7] §8${xp}/${needed} §7| §b✧ ${getChakra(player)}/${max}`
      );
    }
  }, 20);
});
