export const STARTUP_MATRIX_FIELDS = [
    { key: 'problem', label: 'PROBLÉM', prompt: 'Jaký problém váš produkt řeší? Budou za to chtít zákazníci platit?' },
    { key: 'solution', label: 'ŘEŠENÍ', prompt: 'Jakým způsobem problém řešíte? Je inovativní?' },
    { key: 'advantages', label: 'VÝHODY', prompt: 'Jaké nové výhody přináší váš produkt pro zákazníky?' },
    { key: 'market', label: 'TRH, PŘÍLEŽITOST', prompt: 'Kdo je vaše cílová skupina zákazníků, trh? Jak rychle jste schopni přizpůsobit produkt nové skupině zákazníků či geograficky novému trhu?' },
    { key: 'risks', label: 'RIZIKA', prompt: 'Jaká jsou rizika vašeho produktu? Dokážete je eliminovat? Jak?' },
    { key: 'businessModel', label: 'OBCHODNÍ MODEL', prompt: 'Popiště stručně váš obchodní model. Za jak dlouhodo plánujete být v černých číslech? Proč?' },
    { key: 'clients', label: 'KLIENTI', prompt: 'Máte již nějaké platící zákazníky nebo získané před-objednávky? Dosáhli jste doposud nějakého úspěchu v přípravě produktu?' },
    { key: 'competition', label: 'KONKURENCE', prompt: 'Kdo je vaše reálná konkurence? Jak jste ji identifikovali? Včem se váš produkt od ní odlišuje?' },
    { key: 'team', label: 'TÝM, ODBORNÍ PORADCI', prompt: 'Představte členy týmu a jejich specializaci. Máte externí odborné poradce, kteří pomáhají s rozvojem produktu?' },
    { key: 'goToMarket', label: 'GO TO MARKET STRATEGIE', prompt: 'Jak se s produktem dostanete a ukotvíte na trhu? Kde chcete s produktem být za 3 měsíce a za rok?' },
];

export function matrixQuestion(field) {
    return [{ type: 'paragraph', runs: [{ text: field.prompt, bold: false, italic: false }] }];
}
