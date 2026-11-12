// app.js : le « cerveau » de la page.
// 1. Il garde les données (le clan, et pour chaque week-end : prix, présents, paiements, affaires).
// 2. Il les affiche dans les cases vides de index.html.
// 3. Quand on clique, il met à jour les données, les enregistre, et réaffiche tout.

// ---------- Ce qui ne change pas : le calendrier et la liste des affaires ----------

const WEEKENDS = [
  { id: "2026-12-05", nom: "Service de la Saint-Nicolas", dates: "sam. 5 déc." },
  { id: "2027-01-23", nom: "week-end clan", dates: "23-24 janv." },
  { id: "2027-02-20", nom: "route d'hiver", dates: "20-23 fév." },
  { id: "2027-03-20", nom: "week-end clan", dates: "20-21 mars" },
  { id: "2027-05-22", nom: "fête de la route", dates: "22-23 mai" },
];

const AFFAIRES = [
  "Kit feu",
  "Kit vaisselle",
  "Pelle-bêche",
  "Grosse gamelle",
  "Petite gamelle n°1",
  "Petite gamelle n°2",
  "Petite gamelle n°3",
  "Louche",
  "Spatule",
  "Sel et poivre",
  "Bidon d'eau",
  "Sacs-poubelles jaunes et noirs",
];

const PRIX_PAR_DEFAUT = 7;

// ---------- Les données qui changent, enregistrées dans le navigateur ----------

// localStorage : une petite mémoire propre à ce navigateur, sur ce téléphone.
// Les prénoms restent donc chez Foucauld : ils ne sont jamais envoyés sur internet.
const CLE = "intendance-clan";

function charger() {
  try {
    const texte = localStorage.getItem(CLE);
    if (texte) return JSON.parse(texte);
  } catch (e) {
    // Mémoire illisible ou bloquée : on repart de zéro plutôt que de planter.
  }
  return { clan: [], weekendChoisi: WEEKENDS[0].id, weekends: {} };
}

function enregistrer() {
  try {
    localStorage.setItem(CLE, JSON.stringify(donnees));
  } catch (e) {
    // Rien à faire : la page marche quand même, mais sans mémoire.
  }
}

let donnees = charger();

// Les infos du week-end choisi (créées vides la première fois).
function weekendActuel() {
  const id = donnees.weekendChoisi;
  if (!donnees.weekends[id]) {
    donnees.weekends[id] = { prix: PRIX_PAR_DEFAUT, intendant: "", presents: {}, payes: {}, affaires: {}, repart: {} };
  }
  // Les week-ends enregistrés avant la séance 5 n'ont pas encore de « repart » : on l'ajoute.
  if (!donnees.weekends[id].repart) donnees.weekends[id].repart = {};
  return donnees.weekends[id];
}

// ---------- Petits outils ----------

// Raccourci pour trouver un élément de la page par son id.
const el = (id) => document.getElementById(id);

// Crée une liste déroulante avec une première option vide.
function menu(choix, valeur, texteVide) {
  const select = document.createElement("select");
  for (const c of ["", ...choix]) {
    const option = document.createElement("option");
    option.value = c;
    option.textContent = c || texteVide;
    option.selected = c === valeur;
    select.appendChild(option);
  }
  return select;
}

// Ceux qui doivent payer : les présents, sauf l'intendant.
function quiDoitPayer(we) {
  return donnees.clan.filter((p) => we.presents[p] && p !== we.intendant);
}

// Écrit un prix à la française : 7.5 devient « 7,5 € ».
const euros = (n) => `${n.toLocaleString("fr-FR")} €`;

// Ménage : l'intendant et ceux qui apportent une affaire doivent être présents
// (et toujours dans le clan). Sinon on les enlève, pour que le message ne mente pas.
function nettoyer(we) {
  const estPresent = (p) => donnees.clan.includes(p) && we.presents[p];
  if (we.intendant && !estPresent(we.intendant)) we.intendant = "";
  for (const objet of AFFAIRES) {
    if (we.affaires[objet] && !estPresent(we.affaires[objet])) delete we.affaires[objet];
    if (we.repart[objet] && !estPresent(we.repart[objet])) delete we.repart[objet];
  }
}

// ---------- Le matériel, d'un week-end à l'autre ----------
// Idée : à la fin d'un week-end, on note qui repart avec chaque affaire.
// Au week-end suivant, l'outil sait donc qui l'a chez lui, et le met d'office.

const ORDRE = WEEKENDS.map((w) => w.id);

// Qui a l'affaire chez lui AVANT ce week-end : celui qui est reparti avec au week-end précédent.
function gardien(id, objet) {
  const i = ORDRE.indexOf(id);
  return i > 0 ? repartAvec(ORDRE[i - 1], objet) : "";
}

// Qui APPORTE l'affaire à ce week-end : celui choisi à la main,
// sinon celui qui l'a chez lui, s'il vient.
function porteur(id, objet) {
  const w = donnees.weekends[id];
  if (!w) return "";
  if (objet in w.affaires) return w.affaires[objet]; // choisi à la main ("" = « à trouver »)
  const g = gardien(id, objet);
  return g && w.presents[g] && donnees.clan.includes(g) ? g : "";
}

// Qui REPART avec l'affaire à la fin de ce week-end : celui choisi à la main,
// sinon celui qui l'a apportée, sinon elle reste chez celui qui l'avait.
function repartAvec(id, objet) {
  const w = donnees.weekends[id];
  if (w && w.repart && w.repart[objet]) return w.repart[objet];
  return porteur(id, objet) || gardien(id, objet);
}

// Combien de fois chacun a été intendant, sur les autres week-ends de l'année.
function foisIntendant(p) {
  return Object.entries(donnees.weekends)
    .filter(([id, w]) => id !== donnees.weekendChoisi && w.intendant === p).length;
}

// Propose l'intendant : parmi les présents, celui qui l'a été le moins souvent.
// En cas d'égalité, on tire au sort parmi les ex aequo.
function proposerIntendant(we) {
  const presents = donnees.clan.filter((p) => we.presents[p]);
  if (presents.length === 0) return null;
  const minimum = Math.min(...presents.map(foisIntendant));
  const candidats = presents.filter((p) => foisIntendant(p) === minimum);
  return candidats[Math.floor(Math.random() * candidats.length)];
}

// ---------- Affichage ----------

function afficher() {
  const we = weekendActuel();
  nettoyer(we);
  const presents = donnees.clan.filter((p) => we.presents[p]);

  // 1. Le week-end
  const choixWe = el("choix-weekend");
  choixWe.innerHTML = "";
  for (const w of WEEKENDS) {
    const option = document.createElement("option");
    option.value = w.id;
    option.textContent = `${w.dates} : ${w.nom}`;
    option.selected = w.id === donnees.weekendChoisi;
    choixWe.appendChild(option);
  }
  el("prix").value = we.prix;

  const ancienIntendant = el("intendant");
  const nouvelIntendant = menu(presents, we.intendant, "— personne —");
  nouvelIntendant.id = "intendant";
  nouvelIntendant.onchange = () => modifier(() => (we.intendant = nouvelIntendant.value));
  ancienIntendant.replaceWith(nouvelIntendant);
  el("info-intendant").textContent = we.intendant
    ? `${we.intendant} a été intendant ${foisIntendant(we.intendant)} fois sur les autres week-ends.`
    : "";

  // 2. Le clan
  const liste = el("liste-clan");
  liste.innerHTML = "";
  if (donnees.clan.length === 0) {
    liste.innerHTML = '<li class="vide">Ajoute d\'abord les prénoms du clan, en bas de cette carte.</li>';
  } else {
    liste.innerHTML = '<li class="entete"><span></span><span>Vient</span><span>A payé</span><span></span></li>';
  }
  for (const p of donnees.clan) {
    const li = document.createElement("li");
    if (!we.presents[p]) li.className = "absent";

    const nom = document.createElement("span");
    nom.textContent = p === we.intendant ? `${p} (intendant)` : p;

    const vient = document.createElement("input");
    vient.type = "checkbox";
    vient.checked = !!we.presents[p];
    vient.onchange = () => modifier(() => {
      we.presents[p] = vient.checked;
      if (!vient.checked) {
        we.payes[p] = false;
        if (we.intendant === p) we.intendant = "";
      }
    });

    // La case « a payé » n'existe que pour ceux qui doivent payer.
    let paye = document.createElement("span");
    if (we.presents[p] && p !== we.intendant) {
      paye = document.createElement("input");
      paye.type = "checkbox";
      paye.checked = !!we.payes[p];
      paye.onchange = () => modifier(() => (we.payes[p] = paye.checked));
    } else if (p === we.intendant) {
      paye.textContent = "—";
    }

    const retirer = document.createElement("button");
    retirer.type = "button";
    retirer.className = "retirer";
    retirer.textContent = "×";
    retirer.title = `Retirer ${p} du clan`;
    retirer.onclick = () => {
      if (confirm(`Retirer ${p} du clan ?`)) {
        modifier(() => (donnees.clan = donnees.clan.filter((x) => x !== p)));
      }
    };

    li.append(nom, vient, paye, retirer);
    liste.appendChild(li);
  }

  const doivent = quiDoitPayer(we);
  const pasPaye = doivent.filter((p) => !we.payes[p]);
  el("total").textContent = donnees.clan.length === 0 ? "" :
    `${presents.length} présent(s). Reste à rembourser : ${pasPaye.length} personne(s), soit ${euros(pasPaye.length * we.prix)}.`;

  // 3. Les affaires
  const id = donnees.weekendChoisi;
  const listeAffaires = el("liste-affaires");
  listeAffaires.innerHTML = "";
  for (const objet of AFFAIRES) {
    const li = document.createElement("li");
    const gauche = document.createElement("div");
    const nom = document.createElement("span");
    nom.textContent = objet;
    gauche.appendChild(nom);
    // Petite ligne en dessous : chez qui est l'affaire depuis le dernier week-end.
    const g = gardien(id, objet);
    if (g) {
      const detail = document.createElement("small");
      detail.className = we.presents[g] ? "detail" : "detail attention";
      detail.textContent = we.presents[g] ? `chez ${g}` : `chez ${g}, qui ne vient pas : à faire passer`;
      gauche.appendChild(detail);
    }
    const qui = menu(presents, porteur(id, objet), "à trouver");
    qui.onchange = () => modifier(() => (we.affaires[objet] = qui.value));
    li.append(gauche, qui);
    listeAffaires.appendChild(li);
  }

  // 3 bis. Fin du week-end : qui repart avec quoi
  const listeRepart = el("liste-repart");
  listeRepart.innerHTML = "";
  for (const objet of AFFAIRES) {
    const li = document.createElement("li");
    const nom = document.createElement("span");
    nom.textContent = objet;
    // Par défaut, celui qui l'a apportée la remporte.
    const parDefaut = porteur(id, objet) || gardien(id, objet);
    const qui = menu(presents, we.repart[objet] || "", parDefaut ? `${parDefaut} (comme à l'aller)` : "personne");
    qui.onchange = () => modifier(() => {
      if (qui.value) we.repart[objet] = qui.value;
      else delete we.repart[objet];
    });
    li.append(nom, qui);
    listeRepart.appendChild(li);
  }
  el("message-fin").value = fabriquerMessageFin();

  // 4. Le message
  // S'il a été retouché à la main, on garde la retouche au lieu de le refabriquer.
  const automatique = fabriquerMessage(we, pasPaye);
  const retouche = typeof we.messagePerso === "string";
  el("message").value = retouche ? we.messagePerso : automatique;
  el("retouche").hidden = !retouche;
  // Si les cases ont changé depuis la retouche, le texte retouché n'est plus à jour : on prévient.
  el("retouche-texte").textContent = retouche && we.messageBase !== automatique
    ? "Attention : les cases ont changé depuis ta retouche, ton texte n'est plus à jour."
    : "Tu as retouché le message : il ne change plus tout seul.";
}

function fabriquerMessage(we, pasPaye) {
  const w = WEEKENDS.find((x) => x.id === donnees.weekendChoisi);
  const lignes = [`Salut les gars ! Pour le ${w.nom} (${w.dates}) :`, "", "Qui apporte quoi :"];
  const id = donnees.weekendChoisi;
  for (const objet of AFFAIRES) {
    const p = porteur(id, objet);
    const g = gardien(id, objet);
    let qui = p || "à trouver !";
    if (!p && g && !we.presents[g]) qui = `à trouver ! (c'est ${g} qui l'a : à faire passer)`;
    lignes.push(`- ${objet} : ${qui}`);
  }
  lignes.push("");
  const aQui = we.intendant ? ` à rembourser à ${we.intendant}` : "";
  lignes.push(`Intendance : ${euros(we.prix)}${aQui}.`);
  if (pasPaye.length > 0) lignes.push(`Pas encore remboursé : ${pasPaye.join(", ")}.`);
  return lignes.join("\n");
}

// Le message de fin de week-end : qui garde quoi jusqu'au prochain.
function fabriquerMessageFin() {
  const w = WEEKENDS.find((x) => x.id === donnees.weekendChoisi);
  const lignes = [`Merci pour le ${w.nom} ! Qui garde quoi jusqu'au prochain week-end :`, ""];
  for (const objet of AFFAIRES) {
    lignes.push(`- ${objet} : ${repartAvec(w.id, objet) || "personne ?!"}`);
  }
  return lignes.join("\n");
}

// Toute modification passe par ici : on change, on enregistre, on réaffiche.
function modifier(changement) {
  changement();
  enregistrer();
  afficher();
}

// ---------- Les réactions aux champs fixes de la page ----------

el("choix-weekend").onchange = (e) => modifier(() => (donnees.weekendChoisi = e.target.value));

el("prix").onchange = (e) => modifier(() => (weekendActuel().prix = Number(e.target.value) || 0));

el("ajout-routier").onsubmit = (e) => {
  e.preventDefault(); // sinon le formulaire recharge la page
  // On peut taper plusieurs prénoms d'un coup, séparés par des virgules
  // ou des retours à la ligne : « Paul, Louis, Jean ».
  const prenoms = el("nouveau-prenom").value.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p);
  // « jean » et « Jean », c'est la même personne : on compare en minuscules.
  const dejaLa = (prenom) => donnees.clan.some((p) => p.toLowerCase() === prenom.toLowerCase());
  const doublons = prenoms.filter(dejaLa);
  modifier(() => {
    for (const prenom of prenoms) {
      if (!dejaLa(prenom)) donnees.clan.push(prenom);
    }
  });
  if (doublons.length > 0) alert(`Déjà dans le clan : ${doublons.join(", ")}.`);
  el("nouveau-prenom").value = "";
};

el("proposer-intendant").onclick = () => {
  const we = weekendActuel();
  const choisi = proposerIntendant(we);
  if (!choisi) {
    alert("Coche d'abord qui vient ce week-end.");
    return;
  }
  modifier(() => (we.intendant = choisi));
};

// Quand on tape dans le message, on enregistre la retouche, sans tout réafficher
// (sinon le curseur sauterait à chaque lettre).
el("message").oninput = () => {
  const we = weekendActuel();
  if (typeof we.messagePerso !== "string") {
    // Première retouche : on retient le message automatique de départ, pour savoir plus tard s'il a changé.
    we.messageBase = fabriquerMessage(we, quiDoitPayer(we).filter((p) => !we.payes[p]));
  }
  we.messagePerso = el("message").value;
  enregistrer();
  el("retouche").hidden = false;
};

el("revenir-auto").onclick = () => modifier(() => {
  const we = weekendActuel();
  delete we.messagePerso;
  delete we.messageBase;
});

// Copie un texte dans le presse-papiers ; si le navigateur refuse, on le sélectionne pour une copie à la main.
async function copier(bouton, zone, texteNormal, texteOk) {
  try {
    await navigator.clipboard.writeText(zone.value);
    bouton.textContent = texteOk;
  } catch (e) {
    zone.hidden = false;
    zone.select();
    bouton.textContent = "Sélectionné : fais « Copier »";
  }
  setTimeout(() => (bouton.textContent = texteNormal), 2500);
}

el("copier-fin").onclick = () =>
  copier(el("copier-fin"), el("message-fin"), "Copier le message de fin", "Copié ! Colle-le dans WhatsApp");

el("copier").onclick = () =>
  copier(el("copier"), el("message"), "Copier le message", "Copié ! Colle-le dans WhatsApp");

// ---------- La sauvegarde ----------
// Les données ne sont que sur ce téléphone. Une sauvegarde, c'est tout le contenu
// écrit en texte : on peut l'envoyer à soi-même (WhatsApp, Notes) et le recoller plus tard.

el("copier-sauvegarde").onclick = () => {
  el("texte-sauvegarde").value = JSON.stringify(donnees);
  copier(el("copier-sauvegarde"), el("texte-sauvegarde"), "Copier la sauvegarde",
    "Copiée ! Envoie-la-toi sur WhatsApp ou dans Notes");
};

el("restaurer").onclick = () => {
  let lue;
  try {
    lue = JSON.parse(el("texte-restauration").value);
  } catch (e) {
    lue = null;
  }
  if (!lue || !Array.isArray(lue.clan) || typeof lue.weekends !== "object") {
    alert("Ce texte n'est pas une sauvegarde de l'outil. Recopie-la en entier.");
    return;
  }
  if (confirm(`Remplacer tout ce qu'il y a sur ce téléphone par la sauvegarde (${lue.clan.length} routiers) ?`)) {
    donnees = lue;
    if (!WEEKENDS.some((w) => w.id === donnees.weekendChoisi)) donnees.weekendChoisi = WEEKENDS[0].id;
    el("texte-restauration").value = "";
    modifier(() => {});
  }
};

// Premier affichage au chargement de la page.
afficher();
