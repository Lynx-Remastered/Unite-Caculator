// Data endpoints, immutable configuration, and shared application state.
const DATA_SOURCES = {
  pokemon: ["./data/pokemon.json"],
  stats: ["./data/stats.json"],
  heldItems: ["./data/held_items.json"],
  emblems: ["./data/emblems.json"],
  emblemSets: ["./data/emblem_sets.json"],
  emblemNamesJa: ["./data/emblem_names_ja.json"],
  moveNamesJa: ["./data/move_names_ja.json?v=20260729-acceleration"],
  wikiMoveDescriptionsJa: ["./data/wiki_move_descriptions_ja.json"],
  slowDescriptionsJa: ["./data/slow_descriptions_ja.json"],
  patchNotes: ["./data/patch_notes.json"]
};

const DATA_FETCH_TIMEOUT_MS = 15000;

const FEEDBACK_TYPES = {
  bug: { label: "不具合・計算ミス", prefix: "[不具合]" },
  data: { label: "データの修正", prefix: "[データ修正]" },
  feature: { label: "新しい機能", prefix: "[機能要望]" },
  usability: { label: "使いやすさ・表示", prefix: "[UI改善]" },
  other: { label: "その他", prefix: "[その他]" }
};

const POKEMON_JA = {
  "Absol": "アブソル",
  "Aegislash": "ギルガルド",
  "Alcremie": "マホイップ",
  "Armarouge": "グレンアルマ",
  "Articuno": "フリーザー",
  "Azumarill": "マリルリ",
  "Blastoise": "カメックス",
  "Blaziken": "バシャーモ",
  "Blissey": "ハピナス",
  "Buzzwole": "マッシブーン",
  "Ceruledge": "ソウブレイズ",
  "Chandelure": "シャンデラ",
  "Charizard": "リザードン",
  "Cinderace": "エースバーン",
  "Clefable": "ピクシー",
  "Comfey": "キュワワー",
  "Cramorant": "ウッウ",
  "Crustle": "イワパレス",
  "Darkrai": "ダークライ",
  "Decidueye": "ジュナイパー",
  "Delphox": "マフォクシー",
  "Dhelmise": "ダダリン",
  "Dodrio": "ドードリオ",
  "Dragapult": "ドラパルト",
  "Dragonite": "カイリュー",
  "Duraludon": "ジュラルドン",
  "Eldegoss": "ワタシラガ",
  "Empoleon": "エンペルト",
  "Espeon": "エーフィ",
  "Falinks": "タイレーツ",
  "Feraligatr": "オーダイル",
  "Garchomp": "ガブリアス",
  "Gardevoir": "サーナイト",
  "Gengar": "ゲンガー",
  "Glaceon": "グレイシア",
  "Goodra": "ヌメルゴン",
  "Greedent": "ヨクバリス",
  "Greninja": "ゲッコウガ",
  "Gyarados": "ギャラドス",
  "Ho-Oh": "ホウオウ",
  "Hoopa": "フーパ",
  "Inteleon": "インテレオン",
  "Lapras": "ラプラス",
  "Latias": "ラティアス",
  "Latios": "ラティオス",
  "Leafeon": "リーフィア",
  "Lucario": "ルカリオ",
  "Machamp": "カイリキー",
  "Mamoswine": "マンムー",
  "Mega-Charizard-X": "メガリザードンX",
  "Mega-Charizard-Y": "メガリザードンY",
  "Mega-Gyarados": "メガギャラドス",
  "Mega-Lucario": "メガルカリオ",
  "MewtwoX": "ミュウツーX",
  "MewtwoY": "ミュウツーY",
  "Meganium": "メガニウム",
  "Meowscarada": "マスカーニャ",
  "Meowth": "ニャース",
  "Metagross": "メタグロス",
  "Mew": "ミュウ",
  "Mimikyu": "ミミッキュ",
  "Miraidon": "ミライドン",
  "Moltres": "ファイヤー",
  "Mr.Mime": "バリヤード",
  "Ninetales": "アローラキュウコン",
  "Palkia": "パルキア",
  "Pawmot": "パーモット",
  "Pikachu": "ピカチュウ",
  "Psyduck": "コダック",
  "Quaquaval": "ウェーニバル",
  "Raichu": "ライチュウ",
  "Rapidash": "ガラルギャロップ",
  "Sableye": "ヤミラミ",
  "Scizor": "ハッサム",
  "Scyther": "ストライク",
  "Sirfetchd": "ネギガナイト",
  "Skeledirge": "ラウドボーン",
  "Slowbro": "ヤドラン",
  "Snorlax": "カビゴン",
  "Suicune": "スイクン",
  "Sylveon": "ニンフィア",
  "Talonflame": "ファイアロー",
  "Tinkaton": "デカヌチャン",
  "Trevenant": "オーロット",
  "Tsareena": "アマージョ",
  "Typhlosion": "バクフーン",
  "Tyranitar": "バンギラス",
  "Umbreon": "ブラッキー",
  "Urshifu": "ウーラオス",
  "Vaporeon": "シャワーズ",
  "Venusaur": "フシギバナ",
  "Wigglytuff": "プクリン",
  "Yveltal": "イベルタル",
  "Zacian": "ザシアン",
  "Zapdos": "サンダー",
  "Zeraora": "ゼラオラ",
  "Zoroark": "ゾロアーク"
};

const HELD_ITEM_JA = {
  "Accel Bracer": { name: "アクセルリスト", effect: "相手チームのポケモンをKO、またはアシストすると、バトル終了まで攻撃が上がります。" },
  "Aeos Cookie": { name: "エオスビスケット", effect: "ゴールを決めると、バトル終了まで最大HPが上がります。" },
  "Amulet Coin": { name: "おまもりこばん", effect: "野生ポケモンをKOしたときに得られるエオスエナジーが増え、ゴール速度も上がります。" },
  "Assault Vest": { name: "とつげきチョッキ", effect: "一定時間、特攻系のダメージを受けていないと、特攻系ダメージを防ぐシールドを得ます。" },
  "Attack Weight": { name: "もうこうダンベル", effect: "ゴールを決めると、バトル終了まで攻撃が上がります。最大6回。" },
  "Big Root": { name: "おおきなねっこ", effect: "自分へのHP回復効果が上がります。" },
  "Buddy Barrier": { name: "おたすけバリア", effect: "ユナイトわざ使用時、自分と近くの味方1体にシールドを付与します。" },
  "Charging Charm": { name: "じゅうてんチャーム", effect: "移動や通常攻撃でエネルギーをため、満タン時に追加ダメージを与えます。" },
  "Charizardite X": { name: "リザードナイトX", effect: "リザードンに持たせると、バトル中にメガリザードンXへメガシンカできます。" },
  "Charizardite Y": { name: "リザードナイトY", effect: "リザードンに持たせると、バトル中にメガリザードンYへメガシンカできます。" },
  "Choice Scarf": { name: "こだわりスカーフ", effect: "通常攻撃で隠し段階をため、一定段階で移動速度が上がります。" },
  "Choice Specs": { name: "こだわりメガネ", effect: "わざで相手ポケモンにダメージを与えると、最初に当たった相手へ追加ダメージを与えます。" },
  "Curse Bangle": { name: "のろいのバングル", effect: "攻撃系ダメージを与えた相手のHP回復効果を下げます。" },
  "Curse Incense": { name: "のろいのおこう", effect: "特攻系ダメージを与えた相手のHP回復効果を下げます。" },
  "Drain Crown": { name: "いやしのかんむり", effect: "攻撃系の通常攻撃で与えたダメージに応じてHPを回復します。" },
  "Drive Lens": { name: "ドライブレンズ", effect: "相手チームのポケモンをKO、またはアシストすると、バトル終了まで特攻が上がります。" },
  "Energy Amplifier": { name: "エナジーアンプ", effect: "ユナイトわざ使用後、一定時間与えるダメージが上がります。" },
  "Exp Share": { name: "がくしゅうそうち", effect: "チーム内で経験値が最も少ないとき、追加経験値を得ます。" },
  "Float Stone": { name: "かるいし", effect: "戦闘していない時間が続くと、移動速度が上がります。" },
  "Focus Band": { name: "きあいのハチマキ", effect: "HPが少なくなったとき、失ったHPの一部を継続回復します。" },
  "Gyaradosite": { name: "ギャラドスナイト", effect: "ギャラドスに持たせると、バトル中にメガシンカできます。" },
  "Leftovers": { name: "たべのこし", effect: "戦闘していない時間が続くと、最大HPに応じて継続回復します。" },
  "Lucarionite": { name: "ルカリオナイト", effect: "ルカリオに持たせると、バトル中にメガシンカできます。" },
  "Mewtwonite X": { name: "ミュウツナイトX", effect: "ミュウツーに持たせると、バトル中にメガミュウツーXへメガシンカできます。" },
  "Mewtwonite Y": { name: "ミュウツナイトY", effect: "ミュウツーに持たせると、バトル中にメガミュウツーYへメガシンカできます。" },
  "Muscle Band": { name: "ちからのハチマキ", effect: "通常攻撃に、相手の残りHPに応じた攻撃系の追加ダメージを付けます。" },
  "Rapid Fire Scarf": { name: "れんだスカーフ", effect: "通常攻撃で隠し段階をため、一定段階で通常攻撃速度が上がります。" },
  "Razor Claw": { name: "するどいツメ", effect: "わざ使用後の次の通常攻撃に追加ダメージを付けます。近接ポケモンなら相手の移動速度も下げます。" },
  "Rescue Hood": { name: "レスキューフード", effect: "味方に与えるHP回復効果とシールド効果が11/14/17%上がります。自分への効果には適用されません。" },
  "Resonant Guard": { name: "きょうめいガード", effect: "相手ポケモンに技でダメージを与えると、自分と近くの味方1体にシールドを付与します。通常攻撃・強化攻撃では発動しません。" },
  "Rocky Helmet": { name: "ゴツゴツメット", effect: "一定以上のダメージを受けると、近くの相手に最大HPに応じた攻撃系ダメージを与えます。" },
  "Rusted Sword": { name: "くちたけん", effect: "ザシアン用の専用持ち物です。" },
  "Scope Lens": { name: "ピントレンズ", effect: "通常攻撃が急所に当たったとき、攻撃に応じた追加ダメージを与えます。" },
  "Score Shield": { name: "ゴールサポーター", effect: "ゴール中にシールドを得て、シールドが残っている間はゴールを妨害されません。" },
  "Shell Bell": { name: "かいがらのすず", effect: "わざを相手ポケモンに当てると、特攻に応じてHPを回復します。" },
  "Slick Spoon": { name: "すりぬけスプーン", effect: "特攻系ダメージを与えるとき、相手の特防を一部無視します。" },
  "Sp. Atk Specs": { name: "しんげきメガネ", effect: "ゴールを決めると、バトル終了まで特攻が上がります。最大6回。" },
  "Tenacity Belt": { name: "ふんばりベルト", effect: "妨害を受けたとき、防御と特防が一定時間上がります。" },
  "Vanguard Bell": { name: "さきがけベル", effect: "相手に妨害を与えると、自分の最大HPに応じてHPを回復します。" },
  "Weakness Policy": { name: "じゃくてんほけん", effect: "ダメージを受けると、一定時間攻撃が上がります。最大4段階。" },
  "Wise Glasses": { name: "ものしりメガネ", effect: "特攻を割合でさらに上げます。" }
};

const EXCLUSIVE_HELD_ITEM_OWNERS = Object.freeze({
  "Charizardite X": "Mega-Charizard-X",
  "Charizardite Y": "Mega-Charizard-Y",
  "Gyaradosite": "Mega-Gyarados",
  "Lucarionite": "Mega-Lucario",
  "Mewtwonite X": "MewtwoX",
  "Mewtwonite Y": "MewtwoY",
  "Rusted Sword": "Zacian"
});

const STAT_JA = {
  "Attack": "攻撃",
  "Sp. Attack": "特攻",
  "Defense": "防御",
  "Sp. Defense": "特防",
  "HP": "HP",
  "Speed": "移動速度",
  "Attack Speed": "通常攻撃速度",
  "CD Reduction": "待ち時間短縮",
  "Critical-Hit Rate": "急所率",
  "Critical-Hit Damage Modifier": "急所ダメージ補正",
  "Max HP": "最大HP",
  "Damage": "ダメージ",
  "Remaining HP": "残りHP",
  "Reduced HP Recovery": "HP回復低下",
  "Sp. Defense Penetration": "特防無視",
  "Shield": "シールド",
  "Shield and Recovery Effects": "シールド/回復効果"
};

const LABEL_EXACT_JA = {
  "Healing (4x)": "回復（4回）",
  "Damage - Mark": "ダメージ - マーク",
  "Healing - Mark": "回復 - マーク",
  "Damage - Flurry": "ダメージ - 連続攻撃"
};

const LABEL_REPLACEMENTS = [
  ["Damage", "ダメージ"],
  ["Basic", "通常攻撃"],
  ["Boosted", "強化攻撃"],
  ["Subsequent Hits", "後続ヒット"],
  ["Subsequent Punches", "後続パンチ"],
  ["Additional", "追加"],
  ["First Flame", "最初の炎"],
  ["First Star", "最初の星"],
  ["First Leaf", "最初の葉"],
  ["Burn", "やけど"],
  ["Ticks", "回"],
  ["Tick", "回"],
  ["First Hit", "1段目"],
  ["Second Hit", "2段目"],
  ["Third Hit", "3段目"],
  ["Final Hit", "最終段"],
  ["Full", "フルヒット"],
  ["Reduced", "軽減"],
  ["Near", "近距離"],
  ["Far", "遠距離"],
  ["Interrupted Attack", "割り込み攻撃"],
  ["Backstab", "背面ヒット"],
  ["Initial", "初段"],
  ["Explosion", "爆発"],
  ["Healing", "回復"],
  ["Shield", "シールド"],
  ["Area", "範囲"],
  ["Dash", "ムーブ"],
  ["Hit", "ヒット"],
  ["Above", "以上"],
  ["Below", "以下"],
  ["No Charge", "チャージなし"],
  ["Uncharged", "未チャージ"],
  ["Fully Charged", "最大チャージ"],
  ["Min Charge", "最小チャージ"],
  ["Low Charge", "低チャージ"],
  ["Mid Charge", "中チャージ"],
  ["High Charge", "高チャージ"],
  ["1st Level Charge", "1段階チャージ"],
  ["2nd Level Charge", "2段階チャージ"],
  ["3rd Level Charge", "3段階チャージ"],
  ["4th Level Charge", "4段階チャージ"],
  ["5th Level Charge", "5段階チャージ"],
  ["Max Charge", "最大チャージ"],
  ["No Gauge", "ゲージなし"],
  ["Full Gauge", "ゲージ満タン"],
  ["Point Blank", "至近距離"],
  ["Medium Distance", "中距離"],
  ["Max Distance", "最大距離"],
  ["Melee Range", "近距離"],
  ["Max Range", "最大距離"],
  ["Close Range", "近距離"],
  ["Long Range", "遠距離"],
  ["Closest", "最近距離"],
  ["Mid range", "中距離"],
  ["Furthest range", "最遠距離"],
  ["Close", "近距離"],
  ["Mid", "中距離"],
  ["Inner Ring", "内側"],
  ["Outer Ring", "外側"],
  ["Frozen Target", "凍結中の相手"],
  ["Frozen Enemies", "凍結中の相手"],
  ["Unfrozen Enemies", "凍結していない相手"],
  ["During Rapid Spin", "高速スピン中"],
  ["No Retreat Formation", "背水の陣中"],
  ["Dispatch formation", "分散の陣中"],
  ["Column group", "縦列の陣"],
  ["Shield Stance", "シールドフォルム"],
  ["Torrent", "げきりゅう中"],
  ["Mega", "メガシンカ中"],
  ["Above", "以上"],
  ["Below", "以下"],
  ["Between", "範囲内"],
  ["Fang Marks", "キバマーク"],
  ["Fang Mark", "キバマーク"],
  ["Coin Marks", "コインマーク"],
  ["Coin Mark", "コインマーク"],
  ["Huge Claw In Dark Pulse", "ダークパルス中の巨大なツメ"],
  ["Huge Claw", "巨大なツメ"],
  ["In Dark Pulse", "ダークパルス中"],
  ["A Pokémon has Bad Dreams", "悪夢中のポケモンがいる"]
];

const ABILITY_JA = {
  "Passive": "特性",
  "Passive Ability": "特性",
  "Basic": "通常攻撃",
  "Auto Attack": "通常攻撃",
  "Move 1": "わざ1",
  "Move 2": "わざ2",
  "Unite Move": "ユナイトわざ"
};

const DEFENSE_EFFECTS = {
  Absol: [
    { id: "boosted", label: "強化攻撃命中後", maxStacks: 1, defenseReductionPercent: 15 }
  ],
  Aegislash: [
    { id: "sacred-sword", label: "せいなるつるぎ命中後", minLevel: 5, maxStacks: 1, defenseIgnorePercent: 25 }
  ],
  Ceruledge: [
    { id: "psycho-cut", label: "サイコカッター命中後", minLevel: 5, maxStacks: 1, defenseReductionFlat: (level) => level >= 11 ? 3 * (level - 1) + 15 : 2 * (level - 1) + 10 }
  ],
  Chandelure: [
    { id: "infiltrator", label: "すりぬけの段階", maxStacks: 6, spDefenseIgnorePercent: 5 }
  ],
  Cramorant: [
    { id: "arrokuda", label: "強化攻撃（サシカマス）命中後", maxStacks: 1, defenseReductionPercent: 20, spDefenseReductionPercent: 5 }
  ],
  Decidueye: [
    { id: "shadow-sneak", label: "かげうち命中後", minLevel: 8, maxStacks: 1, defenseReductionPercent: (level) => level >= 13 ? 60 : 40 }
  ],
  Empoleon: [
    { id: "aqua-jet", label: "激流強化アクアジェット命中後", minLevel: 7, maxStacks: 1, spDefenseReductionPercent: 60 }
  ],
  Feraligatr: [
    { id: "destructive-fangs", label: "破壊のキバ強化攻撃命中後", minLevel: 5, maxStacks: 1, defenseReductionPercent: 30 }
  ],
  Gardevoir: [
    { id: "boosted", label: "強化攻撃命中後", maxStacks: 1, spDefenseReductionPercent: 10 },
    { id: "psychic", label: "サイコキネシスの段階", minLevel: 7, maxStacks: 3, spDefenseReductionPercent: 20 }
  ],
  Gengar: [
    { id: "shadow-ball", label: "シャドーボール命中後", minLevel: 5, maxStacks: 1, spDefenseReductionFlat: (level) => 5 * (level - 1) + 80 }
  ],
  Glaceon: [
    { id: "tail-whip", label: "しっぽをふる命中後", maxStacks: 1, defenseReductionPercent: 30, spDefenseReductionPercent: 30 }
  ],
  Hoopa: [
    { id: "shadow-ball", label: "シャドーボール命中後", minLevel: 4, maxStacks: 1, spDefenseReductionPercent: 30 }
  ],
  Latias: [
    { id: "dragon-breath", label: "りゅうのいぶき命中後", minLevel: 7, maxStacks: 1, spDefenseReductionPercent: 30 }
  ],
  MewtwoX: [
    { id: "unite", label: "ユナイト技命中後", minLevel: 9, maxStacks: 1, defenseReductionPercent: 20 }
  ],
  MewtwoY: [
    { id: "unite", label: "ユナイト技命中後", minLevel: 9, maxStacks: 1, spDefenseReductionPercent: 15 }
  ],
  "Mr.Mime": [
    { id: "psychic", label: "サイコキネシスの段階", minLevel: 4, maxStacks: 8, spDefenseReductionPercent: 5 }
  ],
  Quaquaval: [
    { id: "liquidation", label: "アクアブレイク命中後", minLevel: 7, maxStacks: 1, defenseReductionPercent: 30 }
  ],
  Psyduck: [
    { id: "tail-whip", label: "しっぽをふる命中後", maxLevel: 5, maxStacks: 1, spDefenseReductionPercent: 20 },
    { id: "psychic-plus", label: "サイコキネシス+命中後", minLevel: 13, maxStacks: 1, spDefenseReductionPercent: 25 }
  ],
  Raichu: [
    { id: "stored-power", label: "アシストパワー+の段階", minLevel: 11, maxStacks: 3, spDefenseReductionPercent: 8 }
  ],
  Skeledirge: [
    { id: "blaze", label: "もうか発動中（次の技）", maxStacks: 1, spDefenseIgnorePercent: 35 }
  ],
  Slowbro: [
    { id: "oblivious", label: "どんかんの段階", maxStacks: 5, spDefenseReductionPercent: 4 }
  ],
  Talonflame: [
    { id: "flame-charge", label: "ニトロチャージ+命中後", minLevel: 11, maxStacks: 1, defensePenetrationFlat: (level) => 3 * (level - 1) + 60 }
  ],
  Tinkaton: [
    { id: "thief", label: "どろぼう強化攻撃命中後", minLevel: 7, maxStacks: 1, defenseReductionPercent: (level) => level >= 13 ? 25 : 10, spDefenseReductionPercent: (level) => level >= 13 ? 25 : 10 }
  ],
  Tsareena: [
    { id: "boosted", label: "強化攻撃命中後", maxStacks: 1, defenseReductionPercent: 20 }
  ],
  Tyranitar: [
    { id: "piercing-strength", label: "貫通力の発動中", minLevel: 5, maxStacks: 1, defenseIgnorePercent: 100 }
  ],
  Umbreon: [
    { id: "fake-tears", label: "うそなき命中後", maxStacks: 1, defenseReductionPercent: 20, spDefenseReductionPercent: 20 }
  ],
  Urshifu: [
    { id: "liquidation", label: "アクアブレイク命中後", minLevel: 7, maxStacks: 1, defenseReductionPercent: 30 }
  ],
  Venusaur: [
    { id: "sludge-bomb", label: "ヘドロばくだん命中後", minLevel: 5, maxStacks: 1, spDefenseReductionPercent: 50 }
  ],
  Wigglytuff: [
    { id: "sing", label: "うたうで眠り中", minLevel: 4, maxStacks: 1, defenseReductionPercent: 25, spDefenseReductionPercent: 25 }
  ],
  Zacian: [
    { id: "sacred-sword", label: "せいなるつるぎ発動後", minLevel: 5, maxStacks: 1, defenseIgnorePercent: 10 }
  ]
};

const REGI_BUFFS = {
  none: { name: "", attackPercent: 0, spAttackPercent: 0, description: "" },
  regirock: { name: "レジロック", attackPercent: 0, spAttackPercent: 0, description: "防御+30%・特防+25%" },
  regice: { name: "レジアイス", attackPercent: 0, spAttackPercent: 0, description: "3秒ごとに最大HPの5%回復" },
  registeel: { name: "レジスチル", attackPercent: 15, spAttackPercent: 15, description: "攻撃+15%・特攻+15%" }
};
const PLUS_POWER_STAT_PERCENT = 20;

const FALLBACK_EMBLEM_PRESETS = {
  Palkia: {
    name: "緑6・黒7（GameWith）",
    ids: ["003A", "015A", "041A", "045A", "071A", "088A", "094A", "123A", "198A", "249A"]
  },
  Quaquaval: {
    name: "茶6・白6（GameWith）",
    ids: ["022A", "057A", "068A", "105A", "115A", "128A", "130A", "141A", "142A", "250A"]
  },
  Yveltal: {
    name: "緑6・黒7（GameWith）",
    ids: ["003A", "015A", "041A", "045A", "071A", "088A", "094A", "123A", "198A", "249A"]
  },
  Zapdos: {
    name: "緑6・黒7（ポケモンユナイトWiki*）",
    ids: ["003A", "015A", "041A", "045A", "071A", "088A", "094A", "123A", "198A", "249A"]
  }
};

const DAMAGE_RECOMMENDED_ITEMS = {
  "Absol": ["Scope Lens", "Razor Claw", "Charging Charm"],
  "Aegislash": ["Razor Claw", "Muscle Band", "Focus Band"],
  "Alcremie": ["Buddy Barrier", "Resonant Guard", "Rescue Hood"],
  "Armarouge": ["Choice Specs", "Slick Spoon", "Curse Incense"],
  "Articuno": ["Muscle Band", "Buddy Barrier", "Curse Incense"],
  "Azumarill": ["Scope Lens", "Attack Weight", "Weakness Policy"],
  "Blastoise": ["Focus Band", "Vanguard Bell", "Resonant Guard"],
  "Blaziken": ["Razor Claw", "Attack Weight", "Weakness Policy"],
  "Blissey": ["Buddy Barrier", "Sp. Atk Specs", "Exp Share"],
  "Buzzwole": ["Focus Band", "Attack Weight", "Muscle Band"],
  "Ceruledge": ["Razor Claw", "Muscle Band", "Attack Weight"],
  "Chandelure": ["Choice Specs", "Slick Spoon", "Curse Incense"],
  "Charizard": ["Scope Lens", "Attack Weight", "Curse Bangle"],
  "Cinderace": ["Muscle Band", "Scope Lens", "Rapid Fire Scarf"],
  "Clefable": ["Buddy Barrier", "Sp. Atk Specs", "Exp Share"],
  "Comfey": ["Rescue Hood", "Buddy Barrier", "Resonant Guard"],
  "Cramorant": ["Choice Specs", "Energy Amplifier", "Curse Incense"],
  "Crustle": ["Focus Band", "Resonant Guard", "Razor Claw"],
  "Darkrai": ["Sp. Atk Specs", "Slick Spoon", "Focus Band"],
  "Decidueye": ["Muscle Band", "Curse Bangle", "Float Stone"],
  "Delphox": ["Energy Amplifier", "Choice Specs", "Slick Spoon"],
  "Dhelmise": ["Razor Claw", "Attack Weight", "Weakness Policy"],
  "Dodrio": ["Razor Claw", "Attack Weight", "Charging Charm"],
  "Dragapult": ["Muscle Band", "Scope Lens", "Rapid Fire Scarf"],
  "Dragonite": ["Muscle Band", "Razor Claw", "Scope Lens"],
  "Duraludon": ["Muscle Band", "Scope Lens", "Rapid Fire Scarf"],
  "Eldegoss": ["Muscle Band", "Resonant Guard", "Buddy Barrier"],
  "Empoleon": ["Slick Spoon", "Wise Glasses", "Sp. Atk Specs"],
  "Espeon": ["Choice Specs", "Slick Spoon", "Wise Glasses"],
  "Falinks": ["Focus Band", "Attack Weight", "Weakness Policy"],
  "Feraligatr": ["Razor Claw", "Attack Weight", "Weakness Policy"],
  "Garchomp": ["Muscle Band", "Scope Lens", "Focus Band"],
  "Gardevoir": ["Choice Specs", "Curse Incense", "Energy Amplifier"],
  "Gengar": ["Choice Specs", "Sp. Atk Specs", "Drive Lens"],
  "Glaceon": ["Slick Spoon", "Wise Glasses", "Curse Incense"],
  "Goodra": ["Muscle Band", "Razor Claw", "Focus Band"],
  "Greedent": ["Attack Weight", "Resonant Guard", "Aeos Cookie"],
  "Greninja": ["Muscle Band", "Attack Weight", "Curse Bangle"],
  "Gyarados": ["Razor Claw", "Attack Weight", "Weakness Policy"],
  "Ho-Oh": ["Curse Bangle", "Focus Band", "Attack Weight"],
  "Hoopa": ["Muscle Band", "Curse Incense", "Resonant Guard"],
  "Inteleon": ["Choice Specs", "Slick Spoon", "Wise Glasses"],
  "Lapras": ["Focus Band", "Curse Incense", "Muscle Band"],
  "Latias": ["Wise Glasses", "Sp. Atk Specs", "Curse Incense"],
  "Latios": ["Choice Specs", "Slick Spoon", "Wise Glasses"],
  "Leafeon": ["Razor Claw", "Attack Weight", "Energy Amplifier"],
  "Lucario": ["Attack Weight", "Razor Claw", "Muscle Band"],
  "Machamp": ["Razor Claw", "Attack Weight", "Weakness Policy"],
  "Mamoswine": ["Focus Band", "Vanguard Bell", "Resonant Guard"],
  "Mega-Charizard-X": ["Charizardite X", "Attack Weight", "Weakness Policy"],
  "Mega-Charizard-Y": ["Charizardite Y", "Attack Weight", "Curse Bangle"],
  "Mega-Gyarados": ["Gyaradosite", "Focus Band", "Attack Weight"],
  "Mega-Lucario": ["Lucarionite", "Attack Weight", "Focus Band"],
  "Meowscarada": ["Razor Claw", "Attack Weight", "Energy Amplifier"],
  "Meowth": ["Razor Claw", "Attack Weight", "Accel Bracer"],
  "Metagross": ["Muscle Band", "Razor Claw", "Weakness Policy"],
  "Mew": ["Choice Specs", "Wise Glasses", "Slick Spoon"],
  "MewtwoX": ["Mewtwonite X", "Razor Claw", "Focus Band"],
  "MewtwoY": ["Mewtwonite Y", "Choice Specs", "Muscle Band"],
  "Mimikyu": ["Razor Claw", "Attack Weight", "Charging Charm"],
  "Miraidon": ["Choice Specs", "Curse Incense", "Slick Spoon"],
  "Moltres": ["Slick Spoon", "Sp. Atk Specs", "Wise Glasses"],
  "Mr.Mime": ["Choice Specs", "Buddy Barrier", "Exp Share"],
  "Ninetales": ["Choice Specs", "Curse Incense", "Energy Amplifier"],
  "Pawmot": ["Razor Claw", "Attack Weight", "Focus Band"],
  "Pikachu": ["Energy Amplifier", "Choice Specs", "Slick Spoon"],
  "Psyduck": ["Vanguard Bell", "Curse Incense", "Buddy Barrier"],
  "Quaquaval": ["Razor Claw", "Muscle Band", "Focus Band"],
  "Raichu": ["Wise Glasses", "Curse Incense", "Choice Specs"],
  "Rapidash": ["Sp. Atk Specs", "Wise Glasses", "Shell Bell"],
  "Sableye": ["Float Stone", "Leftovers", "Exp Share"],
  "Scizor": ["Razor Claw", "Muscle Band", "Energy Amplifier"],
  "Sirfetchd": ["Scope Lens", "Razor Claw", "Attack Weight"],
  "Slowbro": ["Focus Band", "Curse Incense", "Resonant Guard"],
  "Snorlax": ["Buddy Barrier", "Exp Share", "Focus Band"],
  "Suicune": ["Curse Incense", "Slick Spoon", "Choice Specs"],
  "Sylveon": ["Muscle Band", "Resonant Guard", "Curse Incense"],
  "Talonflame": ["Razor Claw", "Charging Charm", "Attack Weight"],
  "Tinkaton": ["Focus Band", "Rocky Helmet", "Attack Weight"],
  "Trevenant": ["Focus Band", "Aeos Cookie", "Rocky Helmet"],
  "Tsareena": ["Focus Band", "Attack Weight", "Weakness Policy"],
  "Typhlosion": ["Choice Specs", "Slick Spoon", "Wise Glasses"],
  "Tyranitar": ["Focus Band", "Muscle Band", "Attack Weight"],
  "Umbreon": ["Focus Band", "Resonant Guard", "Aeos Cookie"],
  "Urshifu": ["Razor Claw", "Muscle Band", "Accel Bracer"],
  "Vaporeon": ["Sp. Atk Specs", "Buddy Barrier", "Wise Glasses"],
  "Venusaur": ["Slick Spoon", "Energy Amplifier", "Choice Specs"],
  "Wigglytuff": ["Focus Band", "Buddy Barrier", "Rapid Fire Scarf"],
  "Yveltal": ["Choice Specs", "Wise Glasses", "Slick Spoon"],
  "Zacian": ["Rusted Sword", "Muscle Band", "Razor Claw"],
  "Zapdos": ["Choice Specs", "Wise Glasses", "Slick Spoon"],
  "Zeraora": ["Focus Band", "Muscle Band", "Razor Claw"],
  "Zoroark": ["Muscle Band", "Rapid Fire Scarf", "Attack Weight"]
};

const state = {
  pokemon: [],
  stats: [],
  heldItems: [],
  emblems: [],
  emblemSets: [],
  emblemNamesJa: {},
  moveNamesJa: {},
  wikiMoveDescriptionsJa: { entries: {} },
  slowDescriptionsJa: { entries: {} },
  patchNotes: { patches: [] },
  emblemFallback: null,
  emblemSelections: Array.from({ length: 10 }, () => ({ pokedex: "", grade: "" })),
  activeEmblemSlot: null,
  activeEmblemSuggestion: -1,
  moveEntries: [],
  moveChoices: [],
  shieldMoveEntries: [],
  shieldMoveChoices: [],
  healingMoveEntries: [],
  healingMoveChoices: [],
  rankingRows: [],
  healingRankingRows: [],
  slowRankingRows: [],
  accelerationRankingRows: [],
  selectedMoveSlot: "basic",
  selectedDamageVariantKey: "",
  selectedShieldMoveSlot: "",
  selectedHealingMoveSlot: "",
  selectedHealingEffectKey: "all",
  activeTab: "damage",
  selectedBalanceFilterKeys: [],
  defenseEffectValues: {},
  suppressTargetAutoFill: false,
  targetHpMode: "percent",
  calculationValueVisibility: {
    rawDamage: true,
    finalDamage: true,
    shieldSelf: true,
    shieldAlly: true,
    healingSelf: true,
    healingAlly: true
  }
};

const el = {};
const THEME_STORAGE_KEY = "uniteCalculatorTheme";
const MODE_STORAGE_KEY = "uniteCalculatorMode";
const RANKING_COLUMN_STORAGE_KEY = "uniteCalculatorRankingColumnWidths";
const RANKING_COLUMN_DEFAULT_WIDTHS = {
  rank: 58,
  pokemon: 150,
  move: 280,
  hits: 72,
  raw: 92,
  reduced: 104,
  assumption: 118
};
const RANKING_COLUMN_MIN_WIDTHS = {
  rank: 46,
  pokemon: 110,
  move: 180,
  hits: 56,
  raw: 72,
  reduced: 84,
  assumption: 86
};
const THEMES = ["charmander", "squirtle", "bulbasaur"];
const MODES = ["light", "dark"];
const CALCULATOR_VIEWS = {
  damage: { title: "ダメージ計算", buttonId: "damageTabButton", panelId: "damagePanel" },
  ranking: { title: "ダメージランキング", buttonId: "rankingTabButton", panelId: "rankingPanel" },
  healingRanking: { title: "回復ランキング", buttonId: "healingRankingTabButton", panelId: "healingRankingPanel" },
  slowRanking: { title: "減速ランキング", buttonId: "slowRankingTabButton", panelId: "slowRankingPanel" },
  accelerationRanking: { title: "加速ランキング", buttonId: "accelerationRankingTabButton", panelId: "accelerationRankingPanel" },
  shield: { title: "シールド量計算", buttonId: "shieldTabButton", panelId: "shieldPanel" },
  healing: { title: "回復量計算", buttonId: "healingTabButton", panelId: "healingPanel" },
  balance: { title: "バランス調整", buttonId: "balanceTabButton", panelId: "balancePanel" }
};
const NAVIGATION_GROUPS = {
  calculation: {
    buttonId: "calculationMenuButton",
    submenuId: "calculationSubmenu",
    tabs: ["damage", "shield", "healing"]
  },
  ranking: {
    buttonId: "rankingMenuButton",
    submenuId: "rankingSubmenu",
    tabs: ["ranking", "healingRanking", "accelerationRanking", "slowRanking"]
  }
};
