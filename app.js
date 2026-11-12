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
    donnees.weekends[id] = { prix: PRIX_PAR_DEFAUT, intendant: "", presents: {}, payes: {}, affaires: {} };
  }
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

// ---------- Affichage ----------

function afficher() {
  const we = weekendActuel();
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
    `${presents.length} présent(s). Reste à rembourser : ${pasPaye.length} personne(s), soit ${pasPaye.length * we.prix} €.`;

  // 3. Les affaires
  const listeAffaires = el("liste-affaires");
  listeAffaires.innerHTML = "";
  for (const objet of AFFAIRES) {
    const li = document.createElement("li");
    const nom = document.createElement("span");
    nom.textContent = objet;
    const qui = menu(presents, we.affaires[objet], "à trouver");
    qui.onchange = () => modifier(() => (we.affaires[objet] = qui.value));
    li.append(nom, qui);
    listeAffaires.appendChild(li);
  }

  // 4. Le message
  el("message").value = fabriquerMessage(we, pasPaye);
}

function fabriquerMessage(we, pasPaye) {
  const w = WEEKENDS.find((x) => x.id === donnees.weekendChoisi);
  const lignes = [`Salut les gars ! Pour le ${w.nom} (${w.dates}) :`, "", "Qui apporte quoi :"];
  for (const objet of AFFAIRES) {
    lignes.push(`- ${objet} : ${we.affaires[objet] || "à trouver !"}`);
  }
  lignes.push("");
  const aQui = we.intendant ? ` à rembourser à ${we.intendant}` : "";
  lignes.push(`Intendance : ${we.prix} €${aQui}.`);
  if (pasPaye.length > 0) lignes.push(`Pas encore remboursé : ${pasPaye.join(", ")}.`);
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
  const prenom = el("nouveau-prenom").value.trim();
  if (prenom && !donnees.clan.includes(prenom)) {
    modifier(() => donnees.clan.push(prenom));
  }
  el("nouveau-prenom").value = "";
};

el("copier").onclick = async () => {
  const bouton = el("copier");
  try {
    await navigator.clipboard.writeText(el("message").value);
    bouton.textContent = "Copié ! Colle-le dans WhatsApp";
  } catch (e) {
    // Si le navigateur refuse, on sélectionne le texte pour le copier à la main.
    el("message").select();
    bouton.textContent = "Sélectionné : fais « Copier »";
  }
  setTimeout(() => (bouton.textContent = "Copier le message"), 2500);
};

// Premier affichage au chargement de la page.
afficher();
