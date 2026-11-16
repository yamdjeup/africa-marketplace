"""Liste les chaînes françaises visibles de mobile/ qui ne passent pas par tr(fr, en). Usage : python scripts/check-mobile-i18n.py [--strict]"""
import glob, re, sys

WORDS = r"(Aucun|Aucune|Mon|Mes|Voir|Retour|Panier|Aide|Vous|Votre|Vos|Se |Besoin|Langue|Bonjour|Enregistrer|Annuler|Ajouter|Supprimer|Modifier|Commande|Adresse|Boutique|Accueil|Recherche|Fermer|Continuer|Payer|Livraison|Erreur|Chargement|Réessayer|Nom |Pays|Ville|Connexion|Compte|Envoyer|Valider|Impossible|Veuillez|Merci|Choisir|Indiquez|Une |Un |Le |La |Les |Pas |Pour )"
ACC = r"[éèêëàâçùûôîï’œŒÉÀ]"
STR = re.compile(r"\"([^\"\n]*)\"|'([^'\n]*)'|`([^`\n]*)`|>([^<>{}\n]+)<|^\s*([^<>{}\n=;()]+)$")
TR = re.compile(r"\[\s*\"[^\"\n]*\"\s*,\s*\"[^\"\n]*\"\s*\]|tr\(\s*(\"[^\"\n]*\"|'[^'\n]*'|`[^`\n]*`)\s*,\s*(\"[^\"\n]*\"|'[^'\n]*'|`[^`\n]*`)\s*\)")
ALLOW = ("fr-FR", "fr", "epomta", "E PÓM TA’", "E póm ta’", "Epomta", "Tílá", "Google", "Stripe")
hits = []
for f in sorted(glob.glob("mobile/*.ts*")):
    if f.endswith(("countries.ts", "flags.tsx", "en.ts", "region.tsx")):
        continue
    for i, line in enumerate(open(f, encoding="utf-8"), 1):
        s = line.strip()
        if s.startswith(("//", "import", "type ", "export type", "*", "/*")):
            continue
        rest = TR.sub("", line)
        for m in STR.finditer(rest):
            txt = next((g for g in m.groups() if g), "")
            if txt.strip() in ALLOW or len(txt.strip()) < 3:
                continue
            if re.search(ACC, txt) or re.match(WORDS, txt.strip()):
                hits.append(f"{f}:{i}: {txt.strip()}")
if "--json" in sys.argv:
    import json
    print(json.dumps(sorted({h.split(": ", 1)[1] for h in hits if "${" not in h}), ensure_ascii=False, indent=0))
    sys.exit(0)
print("\n".join(hits))
print(f"{len(hits)} chaînes à vérifier")
sys.exit(1 if hits and "--strict" in sys.argv else 0)
