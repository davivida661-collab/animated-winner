# 🍥 Addon Naruto Jedy

Addon **fan-made** para **Minecraft Bedrock (MCPE / Windows / Consoles)** com armas, jutsus, equipamentos, **NPCs**, **sistema de nível e chakra** — no mesmo espírito do famoso "Naruto Jedy" do Jedy Tensei, mas criado do zero para esta versão (1.21.50+).

> ⚠️ Projeto de fã, sem afiliação com Masashi Kishimoto, Shueisha ou a Mojang Studios.

---

## 📦 O que vem no addon

| Item | O que faz |
|---|---|
| 🗡️ **Kunai** | Arremessável (6 de dano). Custa 4 de chakra. Também funciona corpo a corpo. |
| ⭐ **Shuriken** | Arremessa **3 shurikens** em leque (4 de dano cada). Custa 6 de chakra. |
| 🔵 **Rasengan** | Jutsu: onda de choque em área + partículas de chakra. Custa 30 de chakra. Dano escala com o nível. |
| ⚡ **Chidori** | Jutsu: dano elétrico em área + Velocidade II + faíscas. Custa 40 de chakra. Dano escala com o nível. |
| ⚔️ **Espada Kusanagi** | Espada lendária, 8 de dano, encantável. |
| 🎗️ **Testeira de Konoha** | Capacete (proteção 3) renderizado no jogador. |
| 🌩️ **Manto da Akatsuki** | Peitoral (proteção 5) com nuvens vermelhas renderizado no jogador. |
| 🍜 **Ramen do Ichiraku** | Comida: restaura 8 de fome + saturação. |
| 📜 **Pergaminho de Treinamento** | Usa para ganhar **+50 XP** instantâneo (ótimo para upar nível). Vendido na loja e craftável. |

### 🧙 NPCs

| NPC | O que faz |
|---|---|
| 🍥 **Mestre Ninja** (`naruto:ninja_sensei`) | NPC amigável com **menu interativo**: Treinar Jutsu (-30 chakra → +25 XP), Curar Ferimentos (grátis), **Contratar Ninja** (companheiro aleatório) e dicas. Clique com a **mão vazia**. |
| 💰 **Mercador Ninja** (`naruto:shopkeeper`) | NPC de **loja**: compre armas, jutsus e pergaminhos com **esmeraldas**, e venda recursos (ferro, lápis-lazúli, diamantes...). Invulnerável. |
| 🥷 **Ninja Renegado** (`naruto:rogue_ninja`) | Inimigo hostil (ataque corpo a corpo) que derruba kunais, shurikens e ramen — e dá **30 XP** ao ser derrotado. |

### 🌍 Spawn natural e contratação

- **Mestre Ninja** e **Mercador Ninja** spawnam sozinhos **de dia** em biomas de planície/floresta/deserto/savana.
- **Ninjas Renegados** spawnam **à noite** em qualquer bioma (como monstros normais).
- **Contratação aleatória**: fale com um Mestre Ninja e escolha *Contratar*. O **preço (10–30 esmeraldas) e o nome são aleatórios** a cada ninja. Depois de contratado ele vira seu **companheiro**: segue você e **luta ao seu lado** contra monstros.
- Ao entrar no mundo pela primeira vez você ganha um **kit inicial aleatório** (1–2 itens: kunais, shurikens e/ou ramen).

### 📈 Sistema de nível e chakra

- **XP**: ganhe ao matar criaturas (zumbis 8, creepers 15, bruxas 20, warden 80, renegados 30...) e ao usar jutsus.
- **Nível**: suba de nível acumulando XP (cada nível exige mais). Ao subir, você ganha **Absorção + Velocidade** temporárias, som de level-up e seu **chakra máximo aumenta** (100 + 10 por nível).
- **Chakra**: regenera com o tempo; jutsus e armas gastam chakra. Sem chakra, o jutsu não ativa.
- **HUD**: barra de XP + chakra sempre visível na action bar.

---

## 🛠️ Estrutura

```
Naruto_Jedy.mcaddon          ← pacote completo (BP + RP juntos)
Naruto_Jedy_BP.mcpack        ← pack de comportamento
Naruto_Jedy_RP.mcpack        ← pack de recursos (texturas/modelos)
Naruto_Jedy_BP/              ← código do addon (itens, jutsus, NPCs, receitas, scripts)
Naruto_Jedy_RP/              ← texturas, modelos e animações
tools/generate_textures.mjs  ← script que gera as texturas (node tools/generate_textures.mjs)
```

---

## 📥 Como instalar

1. Baixe o arquivo **`Naruto_Jedy.mcaddon`** (ou os dois `.mcpack`).
2. Abra o arquivo com o Minecraft (toque/duplo clique ou "Abrir com Minecraft").
3. No mundo, ative os dois packs em **Pacotes de recursos / Comportamento**.
4. Pronto! Use o `/give` para pegar os itens:

```mcfunction
/give @s naruto:kunai 16
/give @s naruto:shuriken 16
/give @s naruto:rasengan
/give @s naruto:chidori
/give @s naruto:kusanagi
/give @s naruto:konoha_headband
/give @s naruto:akatsuki_cloak
/give @s naruto:ramen
/give @s naruto:ninja_sensei_spawn_egg
/give @s naruto:shopkeeper_spawn_egg
/give @s naruto:rogue_ninja_spawn_egg
/give @s naruto:training_scroll 8
```

Todos os itens também têm **receita na mesa de criação** (ferro + graveto para kunais, diamante para a Kusanagi, lápis-lazúli/pó de blaze para os jutsus, etc.).

---

## 🎮 Como jogar

- **Jutsus e armas**: segure o item e **clique com o botão direito** (ou segure na tela no mobile). Cada um tem cooldown próprio e custo de chakra.
- **Mestre Ninja**: spawn com o ovo de spawn, aproxime-se e interaja com a **mão vazia**.
- **Ninja Renegado**: aparece com o ovo de spawn (não spawna naturalmente) e ataca ao ver o jogador. Derrote-o para XP e loot.
- **Sistema de nível**: mate mobs e use jutsus para subir de nível. O progresso fica salvo no jogador (por mundo).

---

## 🔧 Requisitos

- Minecraft Bedrock **1.26.33 ou superior** (Script API 2.x + server-ui 2.x).
- Ative **"Habilidades de Criador/Teste"** no mundo se o script não carregar (em alguns dispositivos é chamado de "Experimental").

---

## 🧪 Testando / modificando

- Texturas: rode `node tools/generate_textures.mjs` para regenerar os PNGs.
- Jutsus, nível e chakra: edite `Naruto_Jedy_BP/scripts/main.js` (componentes registrados no `worldInitialize`, sistema de XP em `addXp`, HUD no `runInterval`).
- NPCs: modelos em `Naruto_Jedy_RP/models/entity/naruto_chibi.geo.json` e comportamento em `Naruto_Jedy_BP/entities/`.
- Ao mudar, recompacte as pastas em `.mcpack`/`.mcaddon` e reimporte no jogo.

**Dica:** o jogo só lê o script na primeira entrada no mundo — depois de mudar o código, saia e entre de novo.

---

## 📜 Changelog v1.3.0

- **Compatibilidade com Minecraft 1.26.33**: atualizado para a Script API **2.x** (`@minecraft/server` 2.6.0 + `@minecraft/server-ui` 2.0.0) e `min_engine_version` [1, 26, 33]
- Ajustado o código para a Script API 2.x, onde os scripts executam **antes do mundo carregar** — o HUD agora inicia após o `worldLoad`

### v1.2.0

- **NPC de loja**: Mercador Ninja com menu de compra/venda usando esmeraldas (9 itens à venda, 4 itens de troca)
- **Spawn natural**: Mestre Ninja e Mercador spawnam de dia; Ninjas Renegados à noite (spawn rules)
- **Contratação aleatória**: ninjas companheiros com nome e preço aleatórios; seguem e lutam ao lado do jogador
- **Pergaminho de Treinamento**: item que dá +50 XP (vendido na loja e craftável)
- **Kit inicial aleatório** na primeira entrada no mundo
- Mestre Ninja agora luta contra monstros e pode ser domado/contratado

### v1.1.0

- **NPCs**: Mestre Ninja (menu interativo com treino, cura e dicas) e Ninja Renegado (inimigo com loot)
- **Sistema de nível**: XP por kills e jutsus, level-up com efeitos e som
- **Sistema de chakra**: regeneração, custos por jutsu e HUD na action bar
- **Dano de jutsus escala com o nível**
- Modelos chibi 3D com animações de andar e idle + texturas exclusivas
- Ovos de spawn para os dois NPCs

### v1.0.0

- Itens customizados com Script API (`@minecraft/server` 1.11+)
- Projéteis de kunai e shuriken com dano e animação de giro
- Jutsus Rasengan e Chidori com partículas e cooldown
- Armaduras com attachables (testeira + manto) renderizadas no jogador
- 12 texturas de pixel art geradas proceduralmente
- Receitas de crafting para todos os itens
- Suporte a pt_BR e en_US
