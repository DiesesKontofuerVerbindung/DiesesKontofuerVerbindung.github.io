"""Refresh the checked-in English fallback; no deployment-time build required."""
import argparse
from html import escape
import json
from pathlib import Path
import re

WURZEL = Path(__file__).resolve().parents[1]


def erzeuge_bereiche(daten):
    texte = daten["locales"]["en"]
    profil = daten["profile"]
    bio = []
    for teile in texte[profil["bioKey"]]:
        absatz = []
        for teil in teile:
            if isinstance(teil, str):
                absatz.append(escape(teil))
            elif "em" in teil:
                absatz.append(f'<em>{escape(teil["em"])}</em>')
            else:
                absatz.append(f'<a class="link" href="{escape(teil["href"], quote=True)}">{escape(teil["text"])}</a>')
        bio.append("<p>" + "".join(absatz) + "</p>")
    sozial = []
    for eintrag in profil["socials"]:
        schluessel = escape(eintrag["labelKey"], quote=True)
        sozial.append(f'<li><a class="link" href="{escape(eintrag["href"], quote=True)}" data-i18n="{schluessel}">{escape(texte[eintrag["labelKey"]])}</a></li>')
    projekte = []
    for projekt in daten["projects"]:
        tags = "".join(f'<li>[{escape(tag)}]</li>' for tag in projekt.get("tags", []))
        jahr = f'<span class="project__year">{escape(projekt["year"])}</span>' if projekt.get("year") else ""
        zusatz = f'    <p class="project__detail" data-i18n="{escape(projekt["detailKey"], quote=True)}">{escape(texte[projekt["detailKey"]])}</p>\n' if projekt.get("detailKey") else ""
        projekte.append(f'''<li class="project reveal" data-project="{escape(projekt['id'], quote=True)}">
  <a class="project__link" href="{escape(projekt['href'], quote=True)}">
    <h3 class="project__title" data-i18n="{escape(projekt['titleKey'], quote=True)}">{escape(texte[projekt['titleKey']])}</h3>
    <span class="project__arrow" aria-hidden="true">↗</span>
    <p class="project__desc" data-i18n="{escape(projekt['descriptionKey'], quote=True)}">{escape(texte[projekt['descriptionKey']])}</p>
{zusatz}    <div class="project__meta mono"><ul class="tags">{tags}</ul>{jahr}</div>
  </a>
</li>''')
    forschung = f'<h2 class="research-map__focus">{escape(daten["research"]["focus"])}</h2>'
    forschung += '<ul class="research-map__topics mono">'
    for thema in daten["research"]["topics"]:
        forschung += f'<li class="research-map__topic">{escape(thema)}</li>'
    forschung += '</ul>'
    return {"research": forschung, "name": escape(profil["name"]), "footer-name": escape(profil["name"]), "role": escape(texte[profil["roleKey"]]),
            "bio": "\n".join(bio), "socials": "\n".join(sozial), "projects": "\n".join(projekte)}


def synchronisiere(pruefen=False):
    daten = json.loads((WURZEL / "data/site.json").read_text(encoding="utf-8"))
    # Missing translations should be caught during editing, not silently shipped.
    for sprache in ("en", "de", "zh"):
        assert daten["locales"][sprache].keys() == daten["locales"]["en"].keys(), sprache
    pfad = WURZEL / "index.html"
    vorher = pfad.read_text(encoding="utf-8")
    nachher = vorher
    for name, inhalt in erzeuge_bereiche(daten).items():
        muster = rf"(<!-- fallback:{name}:start -->).*?(<!-- fallback:{name}:end -->)"
        nachher, anzahl = re.subn(muster, lambda treffer: treffer[1] + inhalt + treffer[2], nachher, flags=re.S)
        assert anzahl == 1, f"Missing or duplicate fallback marker: {name}"
    for muster, wert in [
        (r'(<title data-i18n="meta.title">).*?(</title>)', daten["locales"]["en"]["meta.title"]),
        (r'(<meta name="description" data-i18n="meta.description" content=").*?(">)', daten["locales"]["en"]["meta.description"]),
        (r'(data-i18n-aria-label="nav.language" aria-label=").*?(")', daten["locales"]["en"]["nav.language"]),
        (r'(data-i18n-aria-label="social.contact" aria-label=").*?(")', daten["locales"]["en"]["social.contact"]),
        (r'(data-i18n-aria-label="research.label" aria-label=").*?(")', daten["locales"]["en"]["research.label"]),
        (r'(<span data-i18n="footer.built">).*?(</span>)', daten["locales"]["en"]["footer.built"]),
    ]:
        nachher, anzahl = re.subn(muster, lambda treffer: treffer[1] + escape(wert, quote=True) + treffer[2], nachher, flags=re.S)
        assert anzahl == 1, muster
    if pruefen:
        if nachher != vorher:
            raise SystemExit("English fallback is stale: run python scripts/synchronisiere_inhalte.py")
        print("English fallback is in sync; locale keys match.")
    else:
        pfad.write_text(nachher, encoding="utf-8", newline="\n")
        print("English fallback updated.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    argumente = parser.parse_args()
    synchronisiere(argumente.check)
