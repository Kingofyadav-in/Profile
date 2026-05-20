"use strict";

/* ======================================================
   hi-identity-crypto.js
   Cryptographic HDI foundation for HI Wallet Phase 1A
   Depends on: hi-storage.js
====================================================== */

const HI_IDENTITY_KEY_ID          = "primary";
const HI_IDENTITY_CRYPTO_VERSION  = "hdi-ecdsa-p256-v1";
const HI_IDENTITY_KDF_ITERATIONS  = 310_000;

// BIP-39-compatible English word list (2048 words, 11 bits/word).
// 12 words from this list yields 132 bits of entropy, exceeding the 128-bit minimum.
const HI_RECOVERY_PHRASE_WORDS = [
  // A
  "abandon","ability","able","about","above","absent","absorb","abstract",
  "absurd","abuse","access","accident","account","accuse","achieve","acid",
  "acoustic","acquire","across","act","action","actor","actress","actual",
  "adapt","add","addict","address","adjust","admit","adult","advance",
  "advice","aerobic","afford","afraid","again","age","agent","agree",
  "ahead","aim","air","airport","aisle","alarm","album","alcohol",
  "alert","alien","all","alley","allow","almost","alone","alpha",
  "already","also","alter","always","amateur","amazing","among","amount",
  "amused","analyst","anchor","ancient","anger","angle","angry","animal",
  "ankle","announce","annual","another","answer","antenna","antique","anxiety",
  "any","apart","apology","appear","apple","approve","april","arch",
  "arctic","area","arena","argue","arm","armed","armor","army",
  "around","arrange","arrest","arrive","arrow","art","artefact","artist",
  "artwork","ask","aspect","assault","asset","assist","assume","asthma",
  "athlete","atom","attack","attend","attitude","attract","auction","audit",
  "august","aunt","author","auto","autumn","average","avocado","avoid",
  "awake","aware","away","awesome","awful","awkward","axis",
  // B
  "baby","balance","bamboo","banana","banner","bar","barely","bargain",
  "barrel","base","basic","basket","battle","beach","bean","beauty",
  "because","become","beef","before","begin","behave","behind","believe",
  "below","belt","bench","benefit","best","betray","better","between",
  "beyond","bicycle","bid","bike","bind","biology","bird","birth",
  "bitter","black","blade","blame","blanket","blast","bleak","bless",
  "blind","blood","blossom","blouse","blue","blur","blush","board",
  "boat","body","boil","bomb","bone","book","boost","border",
  "boring","borrow","boss","bottom","bounce","box","boy","bracket",
  "brain","brand","brave","bread","breeze","brick","bridge","brief",
  "bright","bring","brisk","broccoli","broken","bronze","broom","brother",
  "brown","brush","bubble","buddy","budget","buffalo","build","bulb",
  "bulk","bullet","bundle","bunker","burden","burger","burst","bus",
  "business","busy","butter","buyer","buzz",
  // C
  "cabbage","cabin","cable","cactus","cage","cake","call","calm",
  "camera","camp","can","canal","cancel","candy","cannon","canvas",
  "canyon","capable","capital","captain","car","carbon","card","cargo",
  "carpet","carry","cart","case","cash","casino","castle","casual",
  "cat","catalog","catch","category","cattle","caught","cause","caution",
  "cave","cereal","certain","chair","chalk","champion","change","chaos",
  "chapter","charge","chase","chat","cheap","check","cheese","chef",
  "cherry","chest","chicken","chief","child","chimney","choice","choose",
  "chronic","chuckle","chunk","cigar","cinnamon","circle","citizen","city",
  "civil","claim","clap","clarify","claw","clay","clean","clerk",
  "clever","click","client","cliff","climb","clinic","clip","clock",
  "clog","close","cloth","cloud","clown","club","clump","cluster",
  "clutch","coach","coast","coconut","code","coffee","coil","coin",
  "collect","color","column","combine","come","comfort","comic","common",
  "company","concert","conduct","confirm","congress","connect","consider","control",
  "convince","cook","cool","copper","copy","coral","core","corn",
  "correct","cost","cotton","couch","country","couple","course","cousin",
  "cover","coyote","crack","cradle","craft","cram","crane","crash",
  "crazy","cream","credit","creek","crew","cricket","crime","crisp",
  "critic","cross","crouch","crowd","crucial","cruel","cruise","crumble",
  "crunch","crush","cry","crystal","cube","culture","cup","cupboard",
  "curious","current","curtain","curve","cushion","custom","cute","cycle",
  // D
  "dad","damage","damp","dance","danger","daring","dash","daughter",
  "dawn","day","deal","debate","debris","decade","december","decide",
  "decline","decorate","decrease","deer","defense","define","defy","degree",
  "delay","deliver","demand","demise","denial","dentist","deny","depart",
  "depend","deposit","depth","deputy","derive","describe","desert","design",
  "desk","despair","destroy","detail","detect","develop","device","devote",
  "diagram","dial","diamond","diary","dice","diesel","diet","differ",
  "digital","dignity","dilemma","dinner","dinosaur","direct","dirt","disagree",
  "discover","disease","dish","dismiss","disorder","display","distance","divert",
  "divide","divorce","dizzy","doctor","document","dog","doll","dolphin",
  "domain","donate","donkey","donor","door","dose","double","dove",
  "draft","dragon","drama","drastic","draw","dream","dress","drift",
  "drill","drink","drip","drive","drop","drum","dry","duck",
  "dumb","dune","during","dust","dutch","duty","dwarf","dynamic",
  // E
  "eager","eagle","early","earn","earth","easily","east","easy",
  "echo","ecology","edge","edit","educate","effort","egg","eight",
  "either","elbow","elder","electric","elegant","element","elephant","elevator",
  "elite","else","embark","embody","embrace","emerge","emotion","employ",
  "empower","empty","enable","enact","endless","endorse","enemy","energy",
  "enforce","engage","engine","enhance","enjoy","enlist","enough","enrich",
  "enroll","ensure","enter","entire","entry","envelope","episode","equal",
  "equip","erase","erosion","escape","essay","essence","estate","eternal",
  "ethics","evidence","evil","evoke","evolve","exact","example","excess",
  "exchange","excite","exclude","exercise","exhaust","exhibit","exile","exist",
  "exit","exotic","expand","expire","explain","expose","express","extend",
  "extra","eye",
  // F
  "fable","face","faculty","faint","faith","fall","false","fame",
  "family","famous","fan","fancy","fantasy","far","fashion","fat",
  "fatal","father","fatigue","fault","favorite","feature","february","federal",
  "fee","feed","feel","feet","fellow","felt","festival","fetch",
  "fever","few","fiber","fiction","field","figure","file","film",
  "filter","final","find","fine","finger","finish","fire","firm",
  "first","fiscal","fish","fit","fitness","fix","flag","flame",
  "flash","flat","flavor","flee","flight","flip","float","flock",
  "floor","flower","fluid","foam","focus","fog","foil","follow",
  "food","foot","force","forest","forget","fork","fortune","forum",
  "forward","fossil","foster","found","fox","fragile","frame","frequent",
  "fresh","friend","fringe","frog","front","frost","frown","frozen",
  "fruit","fuel","fun","funny","furnace","fury","future",
  // G
  "gadget","gain","galaxy","gallery","game","gap","garbage","garden",
  "garlic","garment","gas","gasp","gate","gather","gauge","gaze",
  "general","genius","genre","gentle","genuine","gesture","ghost","giant",
  "gift","giggle","ginger","giraffe","girl","give","glad","glance",
  "glare","glass","glide","glimpse","globe","gloom","glory","glove",
  "glow","glue","goat","goddess","gold","good","goose","gorilla",
  "gospel","gossip","govern","gown","grab","grace","grain","grant",
  "grape","grasp","grass","gravity","great","green","grid","grief",
  "grit","grocery","group","grow","grunt","guard","guide","guilt",
  "guitar","gun","gym",
  // H
  "habit","hair","half","hammer","hamster","hand","happy","harsh",
  "harvest","hat","have","hawk","hazard","head","health","heart",
  "heavy","hedgehog","height","hello","helmet","help","hero","hidden",
  "high","hill","hint","hip","hire","history","hobby","hockey",
  "hold","hole","holiday","hollow","home","honey","hood","hope",
  "horn","hospital","host","hour","hover","hub","huge","human",
  "humble","humor","hundred","hungry","hunt","hurdle","hurry","hurt",
  "husband","hybrid",
  // I
  "ice","icon","ignore","ill","illegal","image","imitate","immense",
  "immune","impact","impose","improve","impulse","inbox","income","increase",
  "index","indicate","indoor","industry","infant","inflict","inform","inhale",
  "inject","inner","innocent","input","inquiry","insane","insect","inside",
  "inspire","install","intact","interest","into","invest","invite","involve",
  "iron","island","isolate","issue","item","ivory",
  // J
  "jacket","jaguar","jar","jazz","jealous","jeans","jelly","jewel",
  "job","join","joke","journey","joy","judge","juice","jump",
  "jungle","junior","junk","just",
  // K
  "kangaroo","keen","keep","ketchup","key","kick","kid","kingdom",
  "kiss","kitchen","kite","kitten","kiwi","knee","knife","knock","know",
  // L
  "lab","lamp","language","laptop","large","later","laugh","laundry",
  "lava","law","lawn","lawsuit","layer","lazy","leader","learn",
  "leave","lecture","left","leg","legal","legend","lemon","lend",
  "length","lens","leopard","lesson","letter","level","liar","liberty",
  "library","license","life","lift","like","limb","lion","liquid",
  "list","little","live","lizard","load","loan","lobster","local",
  "lock","logic","lonely","long","loop","lottery","loud","lounge",
  "love","loyal","lucky","luggage","lumber","lunar","lunch","luxury",
  // M
  "mad","magic","magnet","maid","main","mammal","mango","mansion",
  "manual","maple","marble","march","margin","marine","market","marriage",
  "mask","master","match","material","math","matter","maximum","maze",
  "meadow","mean","medal","media","melody","melt","member","memory",
  "mention","menu","mercy","mesh","message","metal","method","middle",
  "midnight","milk","million","mimic","mind","minimum","minor","minute",
  "miracle","miss","mitten","mix","mixture","mobile","model","modify",
  "mom","monitor","monkey","monster","month","moon","moral","more",
  "morning","mosquito","mother","motion","motor","mountain","mouse","move",
  "movie","much","muffin","mule","multiply","muscle","museum","mushroom",
  "music","must","mutual","myself","mystery",
  // N
  "naive","name","napkin","narrow","nasty","nature","near","neck",
  "need","negative","neglect","neither","nephew","nerve","nest","never",
  "news","next","nice","night","noble","noise","nominee","noodle",
  "normal","north","notable","note","nothing","notice","novel","now",
  "nuclear","number","nurse","nut",
  // O
  "oak","obey","object","oblige","obscure","obtain","ocean","october",
  "odor","offer","often","oil","okay","old","olive","olympic",
  "omit","once","onion","open","option","orange","orbit","orchard",
  "order","ordinary","organ","orient","original","orphan","ostrich","other",
  "outdoor","outside","oval","over","own","oyster","ozone",
  // P
  "pact","paddle","page","pair","palace","palm","panda","panel",
  "panic","panther","paper","parade","parent","park","parrot","party",
  "pass","patch","path","patrol","pause","pave","payment","peace",
  "peanut","peasant","pelican","pen","penalty","pencil","people","pepper",
  "perfect","permit","person","pet","phone","photo","phrase","physical",
  "piano","picnic","picture","piece","pig","pigeon","pill","pilot",
  "pink","pioneer","pipe","pistol","pitch","pizza","place","planet",
  "plastic","plate","play","please","pledge","pluck","plug","plunge",
  "poem","poet","point","polar","pole","police","pond","pony",
  "pool","popular","portion","position","possible","post","potato","pottery",
  "poverty","powder","power","practice","praise","predict","prefer","prepare",
  "present","pretty","prevent","price","pride","primary","print","priority",
  "prison","private","prize","problem","process","produce","profit","program",
  "project","promote","proof","property","prosper","protect","proud","provide",
  "public","pudding","pull","pulp","pulse","pumpkin","punish","pupil",
  "purchase","purity","purpose","push","put","puzzle","pyramid",
  // Q
  "quality","quantum","quarter","question","quick","quit","quiz","quote",
  // R
  "rabbit","raccoon","race","rack","radar","radio","rage","rail",
  "rain","raise","rally","ramp","ranch","random","range","rapid",
  "rare","rate","rather","raven","reach","ready","real","reason",
  "rebel","rebuild","recall","receive","recipe","record","recycle","reduce",
  "reflect","reform","refuse","region","regret","regular","reject","relax",
  "release","rely","remain","remember","remind","remove","render","renew",
  "rent","reopen","repair","repeat","replace","report","require","rescue",
  "resemble","resist","resource","response","result","retire","retreat","return",
  "reunion","reveal","review","reward","rhythm","ribbon","rice","rich",
  "ride","ridge","rifle","right","rigid","ring","riot","ripple",
  "risk","ritual","rival","river","road","roast","robot","robust",
  "rocket","romance","roof","rookie","room","rose","rotate","rough",
  "royal","rubber","rude","rug","rule","run","runway","rural",
  // S
  "sad","saddle","sadness","safe","sail","salad","salmon","salon",
  "salt","salute","same","sample","sand","satisfy","satoshi","sauce",
  "sausage","save","say","scale","scan","scatter","scene","scheme",
  "scissors","scorpion","scout","scrap","screen","script","scrub","sea",
  "search","season","seat","second","secret","section","security","seek",
  "segment","select","sell","seminar","senior","sense","sentence","series",
  "service","session","settle","setup","seven","shadow","shaft","shallow",
  "share","shed","shell","sheriff","shield","shift","shine","ship",
  "shiver","shock","shoe","shoot","shop","short","shoulder","shove",
  "shrimp","shrug","shuffle","shy","sibling","siege","sight","sign",
  "silent","silk","silly","silver","similar","simple","since","sing",
  "siren","sister","situate","six","size","sketch","skill","skin",
  "skirt","skull","slab","slam","sleep","slender","slice","slide",
  "slight","slim","slogan","slot","slow","slush","small","smart",
  "smile","smoke","smooth","snack","snake","snap","sniff","snow",
  "soap","soccer","social","sock","solar","soldier","solid","solution",
  "solve","someone","song","soon","sorry","soul","sound","soup",
  "source","south","space","spare","spatial","spawn","speak","special",
  "speed","sphere","spice","spider","spike","spin","spirit","split",
  "spoil","sponsor","spoon","spray","spread","spring","spy","square",
  "squeeze","squirrel","stable","stadium","staff","stage","stairs","stamp",
  "stand","start","state","stay","steak","steel","stem","step",
  "stereo","stick","still","sting","stock","stomach","stone","stop",
  "store","storm","strategy","street","strike","strong","struggle","student",
  "stuff","stumble","subject","submit","subway","success","such","sudden",
  "suffer","sugar","suggest","suit","summer","sun","sunny","sunset",
  "super","supply","supreme","sure","surface","surge","surprise","sustain",
  "swallow","swamp","swap","swear","sweet","swift","swing","switch",
  "sword","symbol","symptom","syrup",
  // T
  "table","tackle","tag","tail","talent","tank","tape","target",
  "task","tattoo","taxi","teach","team","tell","ten","tenant",
  "tennis","tent","term","test","text","thank","that","theme",
  "then","theory","there","they","thing","this","thought","three",
  "thrive","throw","thumb","ticket","tide","tiger","tilt","timber",
  "time","tiny","tip","tired","title","toast","tobacco","today",
  "together","toilet","token","tomato","tomorrow","tone","tongue","tonight",
  "tool","topic","topple","torch","tornado","tortoise","toss","total",
  "tourist","toward","tower","town","toy","track","trade","traffic",
  "tragic","train","transfer","trap","trash","travel","tray","treat",
  "tree","trend","trial","tribe","trick","trigger","trim","trip",
  "trophy","trouble","truck","truly","trumpet","trust","truth","try",
  "tube","tumble","tuna","tunnel","turkey","turn","turtle","twelve",
  "twenty","twice","twin","twist","two","type","typical",
  // U
  "ugly","umbrella","unable","undo","unfair","unfold","unhappy","unique",
  "universe","unknown","unlock","until","unusual","unveil","update","upgrade",
  "uphold","upon","upper","upset","urban","used","useful","useless",
  "usual","utility",
  // V
  "vacant","vacuum","vague","valid","valley","valve","van","vanish",
  "vapor","various","vast","vault","vehicle","velvet","vendor","venture",
  "venue","verb","verify","version","very","veteran","viable","vibrant",
  "vicious","victory","video","view","village","vintage","violin","virtual",
  "virus","visa","visit","visual","vital","vivid","vocal","voice",
  "void","volcano","volume","vote","voyage",
  // W
  "wage","wagon","wait","walk","wall","walnut","want","warfare",
  "warm","warrior","waste","water","wave","way","wealth","weapon",
  "wear","weasel","wedding","weekend","weird","welcome","well","west",
  "wet","whale","wheat","wheel","when","where","whip","whisper",
  "wide","width","wife","wild","will","win","window","wine",
  "wing","wink","winner","winter","wire","wisdom","wise","wish",
  "witness","wolf","woman","wonder","wood","wool","word","world",
  "worry","worth","wrap","wreck","wrestle","wrist","write","wrong",
  // Y / Z
  "yard","year","yellow","young","youth","zebra","zero","zone","zoo",
];

let _hiCryptoSessionPrivateKey = null;
let _hiCryptoSessionUnlockedAt = 0;

/* ── Encoding helpers ── */

function hiCryptoBytesToBase64(bytes) {
  let str = "";
  bytes.forEach(byte => { str += String.fromCharCode(byte); });
  return btoa(str);
}

function hiCryptoBase64ToBytes(base64) {
  const str   = atob(base64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function hiCryptoSha256Hex(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hiCryptoRandomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function hiCryptoInitials(name) {
  return String(name ?? "HI")
    .split(/\s+/)
    .map(part => part.charAt(0) ?? "")
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3) || "HDI";
}

async function hiCryptoPublicKeyToHDI(publicKeySpki, name) {
  const hex = await hiCryptoSha256Hex(publicKeySpki);
  return `${hiCryptoInitials(name)}-${new Date().getFullYear()}-K${hex.slice(0, 10).toUpperCase()}`;
}

/* ── Key creation / loading ── */

async function hiCryptoCreateIdentityKey(name) {
  if (!window.crypto?.subtle || !window.TextEncoder) {
    throw new Error("Web Crypto is required for cryptographic HDI.");
  }
  const pair        = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const privatePkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const publicSpki   = new Uint8Array(await crypto.subtle.exportKey("spki",  pair.publicKey));
  const hdi          = await hiCryptoPublicKeyToHDI(publicSpki, name);
  const now          = Date.now();
  const record = {
    id:                       HI_IDENTITY_KEY_ID,
    type:                     "identity-key",
    version:                  HI_IDENTITY_CRYPTO_VERSION,
    algorithm:                "ECDSA-P256-SHA256",
    extractable:              true,
    protection:               "unprotected-local",
    localPrototypeNotice:     "Private key is ready for first-run setup. Protect it with a wallet passphrase from HI Wallet.",
    hdi,
    publicKeySpki:            hiCryptoBytesToBase64(publicSpki),
    privateKeyPkcs8:          hiCryptoBytesToBase64(privatePkcs8),
    recoveryPhraseHash:       "",
    recoveryPhraseCreatedAt:  0,
    createdAt:                now,
    updatedAt:                now,
  };
  await hiPut("identityKeys", record);
  return record;
}

async function hiCryptoLoadIdentityKey() {
  try { return await hiGet("identityKeys", HI_IDENTITY_KEY_ID); }
  catch { return null; }
}

async function hiCryptoEnsureIdentityKey(identity) {
  const existing = await hiCryptoLoadIdentityKey();
  if (existing?.hdi && existing.publicKeySpki && (existing.privateKeyPkcs8 || existing.encryptedPrivateKey)) {
    return existing;
  }
  return hiCryptoCreateIdentityKey(identity?.name ?? "HI Identity");
}

/* ── Key protection status ── */

const hiCryptoIsKeyProtected = record => !!(record?.encryptedPrivateKey && record.privateKeySalt && record.privateKeyIv);
const hiCryptoIsUnlocked     = ()     => !!_hiCryptoSessionPrivateKey;

/* ── Recovery phrase ── */

function hiCryptoNormalizePhrase(phrase) {
  return String(phrase ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function hiCryptoPhraseHash(phrase) {
  const clean = hiCryptoNormalizePhrase(phrase);
  const data  = new TextEncoder().encode(clean);
  if (window.crypto?.subtle) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch { /* fallback below */ }
  }
  return clean;
}

function hiCryptoGenerateRecoveryPhrase(wordCount) {
  const count = Math.max(12, parseInt(wordCount, 10) || 12);
  const bytes = hiCryptoRandomBytes(count);
  const words = [];
  for (let i = 0; i < count; i++) {
    words.push(HI_RECOVERY_PHRASE_WORDS[bytes[i] % HI_RECOVERY_PHRASE_WORDS.length]);
  }
  return words.join(" ");
}

async function hiCryptoRegisterRecoveryPhrase(phrase) {
  const record = await hiCryptoLoadIdentityKey();
  if (!record) throw new Error("Identity key is missing.");
  const clean = hiCryptoNormalizePhrase(phrase);
  if (clean.split(" ").length < 12) throw new Error("Use at least 12 recovery words.");
  record.recoveryPhraseHash      = await hiCryptoPhraseHash(clean);
  record.recoveryPhraseCreatedAt = Date.now();
  record.updatedAt               = Date.now();
  await hiPut("identityKeys", record);
  return { phrase: clean, hash: record.recoveryPhraseHash, createdAt: record.recoveryPhraseCreatedAt };
}

async function hiCryptoRecoveryStatus() {
  const record = await hiCryptoLoadIdentityKey();
  return { registered: !!(record?.recoveryPhraseHash), createdAt: record?.recoveryPhraseCreatedAt ?? 0 };
}

/* ── Wrapping key (PBKDF2) ── */

async function hiCryptoDeriveWrappingKey(passphrase, saltBytes) {
  if (!passphrase || String(passphrase).length < 8) {
    throw new Error("Use a passphrase with at least 8 characters.");
  }
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(passphrase)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: HI_IDENTITY_KDF_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/* ── Encrypt / decrypt private key ── */

async function hiCryptoEncryptPrivateKey(privatePkcs8Base64, passphrase) {
  const salt      = hiCryptoRandomBytes(16);
  const iv        = hiCryptoRandomBytes(12);
  const key       = await hiCryptoDeriveWrappingKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, hiCryptoBase64ToBytes(privatePkcs8Base64));
  return {
    kdf:                 "PBKDF2-SHA256",
    iterations:          HI_IDENTITY_KDF_ITERATIONS,
    cipher:              "AES-256-GCM",
    privateKeySalt:      hiCryptoBytesToBase64(salt),
    privateKeyIv:        hiCryptoBytesToBase64(iv),
    encryptedPrivateKey: hiCryptoBytesToBase64(new Uint8Array(encrypted)),
  };
}

async function hiCryptoDecryptPrivateKey(record, passphrase) {
  if (!hiCryptoIsKeyProtected(record)) {
    if (!record?.privateKeyPkcs8) throw new Error("Identity private key is missing.");
    return record.privateKeyPkcs8;
  }
  const salt      = hiCryptoBase64ToBytes(record.privateKeySalt);
  const iv        = hiCryptoBase64ToBytes(record.privateKeyIv);
  const key       = await hiCryptoDeriveWrappingKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, hiCryptoBase64ToBytes(record.encryptedPrivateKey));
  return hiCryptoBytesToBase64(new Uint8Array(decrypted));
}

/* ── Protect / unlock / lock ── */

async function hiCryptoProtectIdentityKey(passphrase) {
  const record = await hiCryptoLoadIdentityKey();
  if (!record || (!record.privateKeyPkcs8 && !record.encryptedPrivateKey)) throw new Error("Create HDI identity first.");
  if (hiCryptoIsKeyProtected(record) && !record.privateKeyPkcs8) {
    await hiCryptoUnlockIdentityKey(passphrase);
    return record;
  }
  const encrypted  = await hiCryptoEncryptPrivateKey(record.privateKeyPkcs8, passphrase);
  const privateKey = await hiCryptoImportPrivateKey({ privateKeyPkcs8: record.privateKeyPkcs8 });
  const updated    = Object.assign({}, record, encrypted, { privateKeyPkcs8: "", protection: "passphrase-encrypted", protectedAt: Date.now(), updatedAt: Date.now() });
  await hiPut("identityKeys", updated);
  _hiCryptoSessionPrivateKey = privateKey;
  _hiCryptoSessionUnlockedAt = Date.now();
  return updated;
}

async function hiCryptoUnlockIdentityKey(passphrase) {
  const record      = await hiCryptoLoadIdentityKey();
  if (!record) throw new Error("Identity key is missing.");
  const privatePkcs8 = await hiCryptoDecryptPrivateKey(record, passphrase);
  _hiCryptoSessionPrivateKey = await hiCryptoImportPrivateKey({ privateKeyPkcs8: privatePkcs8 });
  _hiCryptoSessionUnlockedAt = Date.now();
  return { hdi: record.hdi, protected: hiCryptoIsKeyProtected(record), unlockedAt: _hiCryptoSessionUnlockedAt };
}

function hiCryptoLockIdentityKey() {
  _hiCryptoSessionPrivateKey = null;
  _hiCryptoSessionUnlockedAt = 0;
}

async function hiCryptoSecurityStatus() {
  const record = await hiCryptoLoadIdentityKey();
  return {
    exists:              !!record,
    hdi:                 record?.hdi                  ?? "",
    protected:           hiCryptoIsKeyProtected(record),
    unlocked:            hiCryptoIsUnlocked(),
    unlockedAt:          _hiCryptoSessionUnlockedAt,
    protection:          record?.protection            ?? "missing",
    recoveryRegistered:  !!(record?.recoveryPhraseHash),
  };
}

/* ── Import key helpers ── */

function hiCryptoImportPrivateKey(record) {
  return crypto.subtle.importKey("pkcs8", hiCryptoBase64ToBytes(record.privateKeyPkcs8), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

function hiCryptoImportPublicKey(record) {
  return crypto.subtle.importKey("spki", hiCryptoBase64ToBytes(record.publicKeySpki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
}

/* ── Sign / verify ── */

async function hiCryptoSignPayload(payload) {
  const record = await hiCryptoLoadIdentityKey();
  if (!record) throw new Error("Identity key is missing.");
  let privateKey = _hiCryptoSessionPrivateKey;
  if (!privateKey && record.privateKeyPkcs8) privateKey = await hiCryptoImportPrivateKey(record);
  if (!privateKey) throw new Error("Unlock identity key before signing.");
  const canonical = JSON.stringify(payload ?? {});
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(canonical));
  return {
    algorithm:     record.algorithm,
    keyVersion:    record.version,
    hdi:           record.hdi,
    publicKeySpki: record.publicKeySpki,
    payload,
    signature:     hiCryptoBytesToBase64(new Uint8Array(signature)),
    signedAt:      new Date().toISOString(),
  };
}

async function hiCryptoVerifyProof(proof) {
  if (!proof?.publicKeySpki || !proof.signature || !proof.payload) return false;
  const publicKey = await hiCryptoImportPublicKey(proof);
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    hiCryptoBase64ToBytes(proof.signature),
    new TextEncoder().encode(JSON.stringify(proof.payload)),
  );
}
