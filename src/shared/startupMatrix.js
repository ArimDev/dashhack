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

export const MATRIX_ANSWER_LIMIT = 600;
export const MATRIX_PRINT_LINE_LIMIT = 18;
export function matrixAnswerText(blocks = []) {
    return blocks.map(block => (block.type === 'bullet' ? '• ' : '') + block.runs.map(run => run.text).join('')).join('\n');
}
// Conservative Calibri 7–9pt wrapping estimate for the template's fixed-width cells.
// Also bounds explicit line breaks so a short answer cannot create hundreds of rows.
export function matrixPrintLines(text, size = 7) {
    const capacity = 144 / size;
    const width = word => Array.from(word).reduce((n, char) => n + (/\s/u.test(char) ? .35 : /[ilI.,:;'!|]/u.test(char) ? .35 : /[MW@%\p{Extended_Pictographic}]/u.test(char) ? 1.1 : /[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/u.test(char) ? .75 : .55), 0);
    return text.split('\n').reduce((total, paragraph) => {
        let lines = 1, used = 0;
        for (const word of paragraph.split(/(\s+)/u)) {
            let wordWidth = width(word);
            if (used && used + wordWidth > capacity) { lines++; used = 0; }
            while (wordWidth > capacity) { lines++; wordWidth -= capacity; }
            used += wordWidth;
        }
        return total + lines;
    }, 0);
}
export function matrixAnswerError(blocks) {
    const text = matrixAnswerText(blocks);
    if (text.length > MATRIX_ANSWER_LIMIT) return `Nejvýše ${MATRIX_ANSWER_LIMIT} znaků na odpověď.`;
    if (matrixPrintLines(text) > MATRIX_PRINT_LINE_LIMIT) return 'Zkraťte odpověď nebo počet řádků, aby se vešla do tiskové buňky.';
    return '';
}

export function matrixAnswerFontSize(blocks) {
    const text = matrixAnswerText(blocks);
    return [9, 8, 7].find(size => matrixPrintLines(text, size) * size * 1.2 <= 150) || 7;
}
