# Týmy — AT&T Hackathon Junior 2026

Produkční událost a přihlašovací jméno: **ATT Hackathon Junior 2026**. Heslo zůstává stejné. Čísla týmů zatím nejsou přidělena. Pořadí odpovídá dodanému seznamu.

Všech 15 repozitářů je soukromých. Původní nepoužité `team-01` až `team-15` byly přejmenovány; jejich ID a oprávnění zůstala zachována. README obsahují skutečný název týmu a barvu trička.

**Jeden opakovaně použitelný soukromý odkaz pro každý tým.** Každý člen si přes stejný týmový odkaz vybere a ověří vlastní GitHub účet (OAuth); ruční zadávání jména bylo odstraněno. Poté přijme pozvánku z e-mailu nebo pozvánek ve vlastním GitHub profilu. Organizátor nemusí předem shánět jména ani žádosti schvalovat. Odkazy jsou v přihlášeném Settings → GitHub App → Student team invitations & audit. Get team links vrací stejné aktivní odkazy; lze je jednotlivě nebo všechny odvolat. Aktuální sada platí do 2026-11-16 (23:20 Praha). Předchozí odkazy jsou neplatné. Soukromé exporty `.data/team-invites-2026.{csv,txt,json}` mají oprávnění 0600 a nejsou v Gitu. Nikdy je nevkládat do veřejného repozitáře. Veřejné odkazy níže vedou pouze do pozvánek v profilu GitHubu; nejsou to týmové přístupové odkazy.

[Veřejný CSV seznam týmů pro doplnění čísel](event-teams-2026.csv)

| Název týmu | Barva trička | HEX | Repozitář | Přijetí pozvánky (po pozvání účtu) |
| --- | --- | --- | --- | --- |
| 505 | yellow | `#FFD600` | [505](https://github.com/AT-T-Hackathon-Junior-2026/505) | [Přijmout](https://github.com/settings/organizations) |
| AYA | red | `#E53935` | [aya](https://github.com/AT-T-Hackathon-Junior-2026/aya) | [Přijmout](https://github.com/settings/organizations) |
| BugBusters | blue | `#1565C0` | [bugbusters](https://github.com/AT-T-Hackathon-Junior-2026/bugbusters) | [Přijmout](https://github.com/settings/organizations) |
| Detrio | green | `#2E7D32` | [detrio](https://github.com/AT-T-Hackathon-Junior-2026/detrio) | [Přijmout](https://github.com/settings/organizations) |
| Indy a Vích | písková | `#C2A477` | [indy-a-vich](https://github.com/AT-T-Hackathon-Junior-2026/indy-a-vich) | [Přijmout](https://github.com/settings/organizations) |
| InovaTeam | yellow | `#F9A825` | [inovateam](https://github.com/AT-T-Hackathon-Junior-2026/inovateam) | [Přijmout](https://github.com/settings/organizations) |
| Last Dance - DOGY | red | `#B71C1C` | [last-dance-dogy](https://github.com/AT-T-Hackathon-Junior-2026/last-dance-dogy) | [Přijmout](https://github.com/settings/organizations) |
| New6en | blue | `#00ACC1` | [new6en](https://github.com/AT-T-Hackathon-Junior-2026/new6en) | [Přijmout](https://github.com/settings/organizations) |
| Ownit | green | `#8BC34A` | [ownit](https://github.com/AT-T-Hackathon-Junior-2026/ownit) | [Přijmout](https://github.com/settings/organizations) |
| pan.png | písková | `#E6CBA8` | [pan.png](https://github.com/AT-T-Hackathon-Junior-2026/pan.png) | [Přijmout](https://github.com/settings/organizations) |
| Penguins | yellow | `#D4A000` | [penguins](https://github.com/AT-T-Hackathon-Junior-2026/penguins) | [Přijmout](https://github.com/settings/organizations) |
| Pixel_Penguin | red | `#FF7043` | [pixel_penguin](https://github.com/AT-T-Hackathon-Junior-2026/pixel_penguin) | [Přijmout](https://github.com/settings/organizations) |
| Replay | blue | `#3949AB` | [replay](https://github.com/AT-T-Hackathon-Junior-2026/replay) | [Přijmout](https://github.com/settings/organizations) |
| Velcord | green | `#00897B` | [velcord](https://github.com/AT-T-Hackathon-Junior-2026/velcord) | [Přijmout](https://github.com/settings/organizations) |
| YoGurts | písková | `#A67C52` | [yogurts](https://github.com/AT-T-Hackathon-Junior-2026/yogurts) | [Přijmout](https://github.com/settings/organizations) |

## Záznam změny — 2026-11-09

V produkci bylo atomicky nahrazeno 15 ukázkových týmů a odstraněno jejich 45 poznámek. Nové týmy mají přesné názvy/barvy/repozitáře a prázdné poznámky, originalitu, abstrakt a startupovou matici. Popis obsahuje pouze barvu trička; žádné fiktivní projektové údaje. Ostatní události, hesla, mentoři, GitHub propojení a celá sociální zeď byly zachovány.

Úplná konzistentní záloha před změnou: `/data/backups/before-real-teams-1794255544253.sqlite` (jen na privátním Railway volume, oprávnění 0600). SQLite integrity i cizí klíče jsou v pořádku. Neměnit zpět podle demo seed skriptu.

Oficiální dokumentace: [outside collaborators](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-outside-collaborators/adding-outside-collaborators-to-repositories-in-your-organization), [repository invitations API](https://docs.github.com/en/rest/collaborators/invitations).
