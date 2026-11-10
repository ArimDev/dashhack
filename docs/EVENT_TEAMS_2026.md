# Týmy — AT&T Hackathon Junior 2026

Produkční událost a přihlašovací jméno: **ATT Hackathon Junior 2026**. Heslo zůstává stejné. Čísla odpovídají potvrzenému zasedacímu pořádku. Karty jdou po řádcích: 11/21/31, 12/22/32, 13/23/33, 14/24/34, 15/25/35.

Všech 15 repozitářů je soukromých. Původní nepoužité `team-01` až `team-15` byly přejmenovány; jejich ID a oprávnění zůstala zachována. README obsahují skutečný název týmu a barvu trička.

**Jeden opakovaně použitelný soukromý odkaz pro každý tým.** Každý člen si přes stejný týmový odkaz vybere a ověří vlastní GitHub účet (OAuth); ruční zadávání jména bylo odstraněno. Poté přijme pozvánku z e-mailu nebo pozvánek ve vlastním GitHub profilu. Organizátor nemusí předem shánět jména ani žádosti schvalovat. Odkazy jsou v přihlášeném Settings → GitHub App → Student team invitations & audit. Get team links vrací stejné aktivní odkazy; lze je jednotlivě nebo všechny odvolat. Aktuální sada platí do 2026-11-16 (23:20 Praha). Předchozí odkazy jsou neplatné. Soukromé exporty `.data/team-invites-2026.{csv,txt,json}` mají oprávnění 0600 a nejsou v Gitu. Nikdy je nevkládat do veřejného repozitáře. Veřejné odkazy níže vedou pouze do pozvánek v profilu GitHubu; nejsou to týmové přístupové odkazy.

[Veřejný CSV seznam týmů pro doplnění čísel](event-teams-2026.csv)

| Název týmu | Barva trička | HEX | Repozitář | Přijetí pozvánky (po pozvání účtu) |
| --- | --- | --- | --- | --- |
| 11 - Detrio | green | `#2E7D32` | [11-detrio](https://github.com/AT-T-Hackathon-Junior-2026/11-detrio) | [Přijmout](https://github.com/settings/organizations) |
| 21 - InovaTeam | yellow | `#F9A825` | [21-inovateam](https://github.com/AT-T-Hackathon-Junior-2026/21-inovateam) | [Přijmout](https://github.com/settings/organizations) |
| 31 - YoGurts | písková | `#A67C52` | [31-yogurts](https://github.com/AT-T-Hackathon-Junior-2026/31-yogurts) | [Přijmout](https://github.com/settings/organizations) |
| 12 - 505 | yellow | `#FFD600` | [12-505](https://github.com/AT-T-Hackathon-Junior-2026/12-505) | [Přijmout](https://github.com/settings/organizations) |
| 22 - Last Dance - DOGY | red | `#B71C1C` | [22-last-dance-dogy](https://github.com/AT-T-Hackathon-Junior-2026/22-last-dance-dogy) | [Přijmout](https://github.com/settings/organizations) |
| 32 - Penguins | yellow | `#D4A000` | [32-penguins](https://github.com/AT-T-Hackathon-Junior-2026/32-penguins) | [Přijmout](https://github.com/settings/organizations) |
| 13 - AYA | red | `#E53935` | [13-aya](https://github.com/AT-T-Hackathon-Junior-2026/13-aya) | [Přijmout](https://github.com/settings/organizations) |
| 23 - New6en | blue | `#00ACC1` | [23-new6en](https://github.com/AT-T-Hackathon-Junior-2026/23-new6en) | [Přijmout](https://github.com/settings/organizations) |
| 33 - Pixel_Penguin | red | `#FF7043` | [33-pixel_penguin](https://github.com/AT-T-Hackathon-Junior-2026/33-pixel_penguin) | [Přijmout](https://github.com/settings/organizations) |
| 14 - BugBusters | blue | `#1565C0` | [14-bugbusters](https://github.com/AT-T-Hackathon-Junior-2026/14-bugbusters) | [Přijmout](https://github.com/settings/organizations) |
| 24 - Ownit | green | `#8BC34A` | [24-ownit](https://github.com/AT-T-Hackathon-Junior-2026/24-ownit) | [Přijmout](https://github.com/settings/organizations) |
| 34 - Replay | blue | `#3949AB` | [34-replay](https://github.com/AT-T-Hackathon-Junior-2026/34-replay) | [Přijmout](https://github.com/settings/organizations) |
| 15 - Indy a Vích | písková | `#C2A477` | [15-indy-a-vich](https://github.com/AT-T-Hackathon-Junior-2026/15-indy-a-vich) | [Přijmout](https://github.com/settings/organizations) |
| 25 - pan.png | písková | `#E6CBA8` | [25-pan.png](https://github.com/AT-T-Hackathon-Junior-2026/25-pan.png) | [Přijmout](https://github.com/settings/organizations) |
| 35 - Velcord | green | `#00897B` | [35-velcord](https://github.com/AT-T-Hackathon-Junior-2026/35-velcord) | [Přijmout](https://github.com/settings/organizations) |

## Záznam změny — 2026-11-09

V produkci bylo atomicky nahrazeno 15 ukázkových týmů a odstraněno jejich 45 poznámek. Nové týmy mají přesné názvy/barvy/repozitáře a prázdné poznámky, originalitu, abstrakt a startupovou matici. Popis obsahuje pouze barvu trička; žádné fiktivní projektové údaje. Ostatní události, hesla, mentoři, GitHub propojení a celá sociální zeď byly zachovány.

Úplná konzistentní záloha před změnou: `/data/backups/before-real-teams-1794255544253.sqlite` (jen na privátním Railway volume, oprávnění 0600). SQLite integrity i cizí klíče jsou v pořádku. Neměnit zpět podle demo seed skriptu.

Oficiální dokumentace: [outside collaborators](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-outside-collaborators/adding-outside-collaborators-to-repositories-in-your-organization), [repository invitations API](https://docs.github.com/en/rest/collaborators/invitations).

## Čísla stolů — 2026-11-10

Po výslovném schválení přepisu zasedacího plánku bylo 15 reálných týmů přejmenováno na „číslo - název“ a jejich existující repozitáře na „číslo-název“. Karty jsou seřazené po řádcích plánku, nikoli abecedně. Zachována ID repozitářů, soukromí, výchozí větve, přístup i stejné OAuth pozvánky; jejich vazby byly aktualizovány na nové cesty. Testovací Team 16, barvy, poznámky, matice i ostatní údaje zůstaly beze změny. Konzistentní záloha před přejmenováním: `/data/backups/before-table-numbering-1794324997278.sqlite`; stav postupu je vedle ní v privátním JSON. Staré názvy repozitářů znovu nepoužívat, aby fungovalo přesměrování GitHubu.
