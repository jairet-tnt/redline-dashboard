export interface AssetItem {
  label: string;
  done: boolean;
}

export interface DriveFile {
  label: string;
  done: boolean;
}

export interface AdBrief {
  id: string;
  number: number;
  title: string;
  type: "image" | "video";
  duration?: string;
  angleCode: string;
  angleName: string;
  tags: string[];
  phase: number;
  concept: string;
  format: string;
  copyPtBr: string;
  cta: string;
  directorNotes?: string;
  shootBrief?: string;
  stage: Stage;
  neededAssets: AssetItem[];
  responsible: string;
  talent: string;
  driveFiles: DriveFile[];
}

export type Stage =
  | "assets"
  | "assets-collected"
  | "editing"
  | "final-review"
  | "ready-to-launch";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "assets", label: "Assets" },
  { id: "assets-collected", label: "Assets Collected" },
  { id: "editing", label: "Editing" },
  { id: "final-review", label: "Final Review" },
  { id: "ready-to-launch", label: "Ready to Launch" },
];

export const SEED_ADS: AdBrief[] = [
  {
    id: "ad-01",
    number: 1,
    title: "Hero — A corda que não para no meio do WOD",
    type: "image",
    angleCode: "A",
    angleName: "Betrayal",
    tags: ["Hero Ad"],
    phase: 1,
    concept:
      "The athlete who's had screws fall out, bearings seize, handles crack — and now picks up something that doesn't do that. The moment of not having to worry about your gear.",
    format:
      "Product-led. Velocity rope coiled clean inside the open hard case, on a rubber gym floor. Dark, high-contrast. Shot close. No hands — just the rope and the case. The case is the silent promise.",
    copyPtBr: `Corda que não para no meio do WOD.

Rolamentos polidos. Cabo revestido.
Case rígido incluso — porque a corda que volta inteira é a corda que você usa de novo.

R$399.`,
    cta: "Garante a sua.",
    neededAssets: [
      { label: "Product shot — rope in open hard case on gym floor", done: false },
      { label: "Dark, high-contrast lighting setup", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Final product photo (.jpg/.png)", done: false },
      { label: "Ad copy text file", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-02",
    number: 2,
    title: "Quantas cordas você já jogou fora?",
    type: "image",
    angleCode: "A",
    angleName: "Betrayal",
    tags: [],
    phase: 2,
    concept:
      "The athlete on their 3rd or 4th cheap rope — one that kinked in the bag, one where the bearing seized, one where the screw flew out in a WOD. The frustration of paying twice for the same result.",
    format:
      "Split composition. Left side: a kinked, tangled generic cable on gym floor — no brand markings. Right side: Velocity coiled cleanly in its hard case. No copy needed in the visual; the image does the work. Dark background. Red brand accent on right panel.",
    copyPtBr: `Quantas cordas você já jogou fora?

Cabo que não dobra no bag.
Rolamentos que não travam no set.
Case que protege quando você não cuida.

R$459 → R$399. Não precisa comprar duas vezes.`,
    cta: "Velocity. Garante a sua.",
    neededAssets: [
      { label: "Kinked/tangled generic rope on gym floor (no brand)", done: false },
      { label: "Velocity coiled in hard case — clean shot", done: false },
      { label: "Split composition composite (dark bg, red accent)", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Left panel photo — tangled rope", done: false },
      { label: "Right panel photo — Velocity in case", done: false },
      { label: "Final composite (.jpg/.png)", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-03",
    number: 3,
    title: "Hero — Quando você para de pensar na corda",
    type: "image",
    angleCode: "B",
    angleName: "Breakthrough",
    tags: ["Hero Ad"],
    phase: 1,
    concept:
      "Mid-set. The rope is completing its arc, the athlete is in the air, everything is aligned. This is the moment right before the breakthrough registers — the streak that doesn't stop. The athlete's face is focused, not frustrated.",
    format:
      "Dynamic action shot. Athlete mid-air, double under in progress. Rope perfectly arced under feet. Gym environment, natural light. Tight crop — movement is primary. No props, no staging.",
    copyPtBr: `Quando você para de pensar na corda.

É aí que começa o set de verdade.`,
    cta: "Velocity. R$399.",
    neededAssets: [
      { label: "Action shot — athlete mid-air, DU in progress", done: false },
      { label: "Gym environment, natural light", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Action photo (.jpg/.png)", done: false },
      { label: "Ad copy text file", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-04",
    number: 4,
    title: "Quando eu erro, sou eu que errei",
    type: "image",
    angleCode: "B",
    angleName: "Breakthrough",
    tags: [],
    phase: 2,
    concept:
      "The athlete after a clean set — holding the rope, looking at it. The quiet acknowledgment that the gear finally did its job. The frustration has no target anymore. That's the feeling.",
    format:
      "Athlete post-set. Holding Velocity in hand, slight exhale visible, sweat on forehead. Gym setting, shallow depth of field. Real — not styled. Copy overlaid in lower third.",
    copyPtBr: `"Quando eu erro, sou eu que errei."

É assim que tem que ser.
Sem escorregada no cabo. Sem trava no rolamento.
Sem desculpa que faça sentido.

Velocity. R$399.`,
    cta: "Treina sem desculpa.",
    neededAssets: [
      { label: "Post-set athlete photo — holding rope, exhale moment", done: false },
      { label: "Shallow depth of field, gym setting", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Athlete photo (.jpg/.png)", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-05",
    number: 5,
    title: "Copy-forward — A Velocity não muda no round 4",
    type: "image",
    angleCode: "C",
    angleName: "Invisibility",
    tags: ["Copy-Forward"],
    phase: 1,
    concept:
      "The flow state — an unbroken set of DUs where the athlete stops being aware of the rope and just moves. This is the end-state desire of every serious jumper.",
    format:
      "Dark, copy-forward graphic. Minimal design. Brand red accent on key line. No photo needed — the rhythm of the copy IS the creative.",
    copyPtBr: `Round 1, você nem percebe.

Round 3, tá cansado.

Round 4, a corda decide.

A Velocity não muda no round 4.

R$399. Case incluso.`,
    cta: "Treina até o fim. Leva a Velocity.",
    neededAssets: [
      { label: "Graphic design — dark bg, red accent, typography only", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Final graphic (.jpg/.png)", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-06",
    number: 6,
    title: "Seu corpo vai cansar. A corda, não.",
    type: "image",
    angleCode: "D",
    angleName: "Fatigue",
    tags: [],
    phase: 2,
    concept:
      "AMRAP round 4 or 5. The body is failing but the rope is still spinning. The handles that felt light at the start still feel light now. The bearing that was smooth on rep 1 is smooth on rep 300.",
    format:
      "Athlete in visible fatigue — flushed, chest heaving, mid-WOD — holding the rope between movements. The rope is the one calm thing in the frame.",
    copyPtBr: `Seu corpo vai cansar.

A corda, não.

58g. Rolamentos polidos. Cabo revestido.
Velocity Speed Rope.

R$399.`,
    cta: "Garante a sua.",
    neededAssets: [
      { label: "Fatigued athlete photo — flushed, heaving, holding rope", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Athlete fatigue photo (.jpg/.png)", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-07",
    number: 7,
    title: "Product Detail — Controle de verdade",
    type: "image",
    angleCode: "A",
    angleName: "Betrayal",
    tags: ["Product Detail"],
    phase: 2,
    concept:
      "The athlete who's had handles slip in sweaty hands, who's had plastic crack mid-grip. The Velocity handle has an answer for every one of those failures.",
    format:
      "Extreme close-up of handle. Silicone rings sharp in focus, knurling texture visible, aluminum sheen. Studio-quality product macro shot. Technical but beautiful.",
    copyPtBr: `Duas posições de grip.
Três anéis de silicone por seção.
Knurling pra quando o suor aparece.
Alumínio 58g.

Controle de verdade — não de catálogo.

Velocity. R$399.`,
    cta: "Ver produto.",
    neededAssets: [
      { label: "Macro product shot — handle close-up, silicone rings, knurling", done: false },
      { label: "Studio lighting setup", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Handle macro photo (.jpg/.png)", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-08",
    number: 8,
    title: "Value Stack — Tudo que você precisa",
    type: "image",
    angleCode: "E",
    angleName: "Value",
    tags: ["Value Stack"],
    phase: 2,
    concept:
      "The moment the package arrives and you open it and there's more than you expected. Not a stripped product with a premium price — a complete kit.",
    format:
      "Flat lay. Hard case open, rope displayed inside. Next to it: extra silicone rings organized by color, hex wrench, spare screws. Shot clean on matte dark surface. No text in image.",
    copyPtBr: `Tudo que você precisa pra começar — e pra durar.

→ Velocity Speed Rope
→ Case rígido (não amassa na mochila)
→ Anéis de silicone extras (personaliza o grip)
→ Parafusos reserva + chave hex

R$459 → R$399.
Não precisa comprar mais nada.`,
    cta: "Garante a sua.",
    neededAssets: [
      { label: "Flat lay — open case + all accessories on dark surface", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Flat lay photo (.jpg/.png)", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-09",
    number: 9,
    title: "Social Proof — Bea 30→52 unbroken",
    type: "image",
    angleCode: "B",
    angleName: "Breakthrough",
    tags: ["Social Proof"],
    phase: 3,
    concept:
      "Bea was already at 30 unbroken. The Velocity didn't teach her double-unders; it removed whatever was holding her back. 30 → 36 → 52 in one week.",
    format:
      "Quote card. Dark background, Bea's photo or action shot, her handle tagged. Numbers prominent — red accent on 52. Brand logo bottom right.",
    copyPtBr: `30 unbroken.

Primeira semana com a Velocity: 36.
Depois de alguns dias: 52.

"A corda parou de ser o problema."

— @[handle_da_Bea]

Velocity Speed Rope. R$399.`,
    cta: "Treina com a mesma.",
    directorNotes:
      "Confirm the quote with Bea — if she said something specific in her own words, use that instead. Her exact language outperforms anything written for her.",
    neededAssets: [
      { label: "Bea's photo or action shot", done: false },
      { label: "Confirmed quote from Bea (her own words)", done: false },
      { label: "Bea's Instagram handle", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Bea photo (.jpg/.png)", done: false },
      { label: "Quote card design (.jpg/.png)", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-10",
    number: 10,
    title: "Identity — Corda sua. Tamanho seu. Grip seu.",
    type: "image",
    angleCode: "C",
    angleName: "Invisibility",
    tags: ["Identity"],
    phase: 2,
    concept:
      "The shared gym rope is the enemy. Wrong length. Wrong weight. Having your own rope — sized to your height, adjusted once, never touched by anyone else — is a competitive advantage.",
    format:
      "Athlete walking into gym, rope over shoulder. Personal gear. Ownership shot. Natural gym entrance light.",
    copyPtBr: `Corda sua. Tamanho seu. Grip seu.

Não tem como fazer double-under na corda de todo mundo.

Velocity. R$399. Case incluso. Só sua.`,
    cta: "Garante a sua.",
    neededAssets: [
      { label: "Athlete entering gym — rope over shoulder, ownership vibe", done: false },
      { label: "Natural gym entrance lighting", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Ownership photo (.jpg/.png)", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-11",
    number: 11,
    title: "Conversion — R$459 → R$399",
    type: "image",
    angleCode: "A+E",
    angleName: "Betrayal + Value",
    tags: ["Conversion"],
    phase: 3,
    concept:
      "The athlete who's been looking, who knows what they want, who just needs the nudge. No metaphor. No story. The offer.",
    format:
      "Bold product + clean price display. Rope hero shot on left, value stack on right. Red price callout. High contrast. Fast to read.",
    copyPtBr: `Velocity Speed Rope

R$459 → R$399

✓ Case rígido
✓ Anéis de silicone extras
✓ Parafusos reserva + chave hex

Frete incluso acima de [threshold].`,
    cta: "Leva a sua.",
    neededAssets: [
      { label: "Product hero shot (rope)", done: false },
      { label: "Value stack graphic design", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Final conversion ad (.jpg/.png)", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-12",
    number: 12,
    title: "Hero Video — Before/After bad rope to breakthrough",
    type: "video",
    duration: "15–20s",
    angleCode: "A+B",
    angleName: "Betrayal + Breakthrough",
    tags: ["Hero Video"],
    phase: 1,
    concept:
      "Opens on a familiar failure moment: athlete fumbling with a tangled rope, visibly frustrated. Hard cut. Same athlete, Velocity in hand, clean unbroken DU set.",
    format:
      "UGC-style. Shot in a real gym, not a studio. Slightly rough edges add credibility. Text overlay for copy — no VO needed. Two-scene structure: Problem (3–5s) → Resolution (10–12s).",
    copyPtBr: `[Scene 1 — no text, just the fumble/frustration]

[Scene 2, 3s in]
"A corda não pode ser o problema."

[End card]
Velocity Speed Rope.
R$399. Case incluso.`,
    cta: "Arrasta pra ver.",
    shootBrief:
      "Scene 1 — film yourself genuinely struggling to get a set going (tripping, adjusting, tangling). Real frustration is fine. Scene 2 — film a clean unbroken set from waist up, 15+ DUs minimum, no stops. Single wide take.",
    neededAssets: [
      { label: "Scene 1 footage — athlete fumbling/frustrated with bad rope", done: false },
      { label: "Scene 2 footage — clean unbroken DU set with Velocity", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Scene 1 raw footage", done: false },
      { label: "Scene 2 raw footage", done: false },
      { label: "Final edited video", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-13",
    number: 13,
    title: "Emotional Payoff — O primeiro set unbroken",
    type: "video",
    duration: "15s",
    angleCode: "B",
    angleName: "Breakthrough",
    tags: ["Emotional Payoff"],
    phase: 2,
    concept:
      "The athlete who just linked their biggest unbroken set. The rope stops. The exhale. The quiet 'finally.' This is the emotional peak the buyer is buying toward.",
    format:
      "UGC athlete video. One take. After the set completes, athlete exhales, looks at rope — that's the shot. Raw, real.",
    copyPtBr: `[During set — no text]

[After set, athlete exhales]
"Você não vai esquecer o primeiro set unbroken."

Velocity. R$399.`,
    cta: "Link na bio.",
    shootBrief:
      "Record your longest unbroken set with the Velocity. Let the camera keep running for 3–5 seconds after you finish. Don't look at camera. Just breathe.",
    neededAssets: [
      { label: "Athlete footage — unbroken set + post-set exhale (one take)", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Raw athlete footage", done: false },
      { label: "Final edited video", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-14",
    number: 14,
    title: "Product Walkthrough — O que vem junto",
    type: "video",
    duration: "30s",
    angleCode: "E",
    angleName: "Value",
    tags: ["Product Walkthrough"],
    phase: 2,
    concept:
      "Someone opens the hard case on a gym bench and shows what's inside, one item at a time. No commercial feel — feels like a friend showing you what they just got.",
    format:
      "Athlete's hands, tight shot on the hard case, gym bench background. No voiceover. On-screen text labels each item with a one-line benefit.",
    copyPtBr: `[Case opens]
"O que vem junto:"

[Rope lifts out]
Velocity Speed Rope — cabo revestido, rolamentos polidos.

[Case shown]
Case rígido — não amassa na mochila.

[Rings shown]
Anéis de silicone extras — personaliza o grip, troca a posição.

[Hardware shown]
Parafusos reserva + chave hex — pra não ficar na mão quando precisar ajustar.

[End card]
R$459 → R$399.
Tudo incluso.`,
    cta: "Arrasta pra comprar.",
    neededAssets: [
      { label: "B-roll: hands opening case on gym bench", done: false },
      { label: "B-roll: lifting rope out of case", done: false },
      { label: "B-roll: showing silicone rings", done: false },
      { label: "B-roll: showing spare hardware + hex wrench", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "All B-roll clips", done: false },
      { label: "Final edited video", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-15",
    number: 15,
    title: "Hypnotic — É assim que tem que parecer",
    type: "video",
    duration: "15s",
    angleCode: "C",
    angleName: "Invisibility",
    tags: ["Hypnotic"],
    phase: 1,
    concept:
      "One uninterrupted angle of a steady DU set. No talking. No text for the first 10 seconds. Just the rope turning, the athlete moving. The visual sells the feeling.",
    format:
      "Single camera angle, waist-up. Smooth, unbroken set — athlete is controlled, not frantic. The rope sound matters: the clean 'tick' of cable on rubber floor. Keep that audio.",
    copyPtBr: `[10s — no text, just the set and the sound]

[10s mark]
"É assim que tem que parecer."

Velocity. R$399.`,
    cta: "Ver produto.",
    shootBrief:
      "Find your most comfortable steady pace. We want a 15-second unbroken set that looks effortless. Don't go max speed — we want control, not chaos. Wear shoes with a clean sole. Jump on rubber if possible.",
    neededAssets: [
      { label: "15s unbroken DU footage — steady pace, waist-up, single angle", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Raw footage with audio", done: false },
      { label: "Final edited video", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-16",
    number: 16,
    title: "WOD Simulation — A corda não cansa",
    type: "video",
    duration: "30s",
    angleCode: "D",
    angleName: "Fatigue",
    tags: ["WOD Simulation"],
    phase: 2,
    concept:
      "AMRAP structure. Round 1: clean DU set. Round 3: visible fatigue but clean set. Round 5: athlete is wrecked, but the rope still goes. The contrast is the message.",
    format:
      "Multi-cut. Three segments — labeled Round 1, Round 3, Round 5. Each shows: athlete picks up rope, executes DU set, sets it down. Body fatigue escalates. Rope performance doesn't.",
    copyPtBr: `[Round 1 — text: "Round 1"]
[Clean set, easy movement]

[Round 3 — text: "Round 3"]
[Athlete is clearly gassed, picks up rope, still clean]

[Round 5 — text: "Round 5"]
[Athlete almost bent over between movements, but the DU set is still there]

[End card]
"A corda não cansa."

Velocity Speed Rope. R$399.`,
    cta: "Garante a sua.",
    neededAssets: [
      { label: "Round 1 footage — clean set, fresh athlete", done: false },
      { label: "Round 3 footage — fatigued but clean set", done: false },
      { label: "Round 5 footage — wrecked athlete, rope still works", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Round 1 clip", done: false },
      { label: "Round 3 clip", done: false },
      { label: "Round 5 clip", done: false },
      { label: "Final edited video", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-17",
    number: 17,
    title: "Setup as Advantage — Mede, corta, pronto",
    type: "video",
    duration: "20s",
    angleCode: "A",
    angleName: "Betrayal",
    tags: ["Setup as Advantage"],
    phase: 2,
    concept:
      "The Velocity reframes its setup process as the advantage: you measure your body, cut once, it fits exactly. No guessing, no second order.",
    format:
      "B-roll hands video. Measuring rope against body, marking, cutting with wire cutters, tightening with hex wrench. Clean and confident.",
    copyPtBr: `[Athlete measures rope against body]
"Mede do seu jeito."

[Cuts with wire cutters]
"Corta uma vez."

[Tightens with hex wrench]
"Pronto. Nunca mais."

[End card]
Tem corda por aí que você compra no tamanho certo
— ou compra de novo.

A Velocity você ajusta. Uma vez. Do seu tamanho.
R$399. Case incluso.`,
    cta: "Arrasta pra ver.",
    directorNotes:
      "The end card doesn't name Skyhill — any athlete who's been burned by the fixed-length model will recognize it immediately.",
    neededAssets: [
      { label: "B-roll: measuring rope against body", done: false },
      { label: "B-roll: marking and cutting cable with wire cutters", done: false },
      { label: "B-roll: tightening with hex wrench", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "All B-roll setup clips", done: false },
      { label: "Final edited video", done: false },
    ],
    stage: "assets",
  },
  {
    id: "ad-18",
    number: 18,
    title: "Social Proof #2 — Placeholder (awaiting athlete)",
    type: "video",
    duration: "20s",
    angleCode: "B",
    angleName: "Breakthrough",
    tags: ["Social Proof", "Placeholder"],
    phase: 2,
    concept:
      "Slot held for the next athlete testimonial with a concrete number or movement unlock. Brief athletes for: a DU PR, a first Rx WOD, or a before/after rep count.",
    format:
      "Same structure as AD 09 — quote card or talking-head UGC, 15–20 seconds. Dark background, handle tagged, number prominent.",
    copyPtBr: `[Resultado específico do atleta — ex: primeiro Rx, novo PR de DU, contagem antes/depois]

"[Palavras do próprio atleta — uma frase.]"

— @[handle]

Velocity Speed Rope. R$399.`,
    cta: "Treina com a mesma.",
    directorNotes:
      "Do not publish with placeholder copy. This slot activates once a second athlete delivers a concrete, quotable outcome. Brief athletes specifically: 'Me fala um número — quantos DUs você fazia antes, quantos fez com a Velocity.'",
    neededAssets: [
      { label: "Athlete photo or video testimonial", done: false },
      { label: "Confirmed quote with concrete number", done: false },
      { label: "Athlete Instagram handle", done: false },
    ],
    responsible: "",
    talent: "",
    driveFiles: [
      { label: "Athlete media", done: false },
      { label: "Final quote card or video", done: false },
    ],
    stage: "assets",
  },
];
