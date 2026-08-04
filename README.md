# Kooperativa – osobní dotazník zaměstnance

Interaktivní statická webová aplikace pro vyplnění osobního dotazníku a vytvoření PDF přímo v prohlížeči.

## Funkce

- pětikrokový formulář s kontrolou údajů,
- přidávání a odebírání dětí a vyživovaných osob,
- podmíněná pole podle odpovědí ANO/NE,
- datum ve formátu DD.MM.RRRR,
- elektronický podpis kresbou nebo obrázkem, případně ruční podpis po vytištění,
- náhled, stažení a tisk PDF ve vizuálním stylu Kooperativy.

## Provoz

Aplikace je čistě statická. Údaje formuláře se neposílají do GitHubu ani na aplikační server. PDF se vytváří v prohlížeči pomocí html2pdf.js.

## GitHub Pages

Workflow v `.github/workflows/pages.yml` publikuje obsah repozitáře na GitHub Pages. V nastavení repozitáře vyberte **Settings → Pages → Source: GitHub Actions**.
