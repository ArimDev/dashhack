import {STARTUP_MATRIX_FIELDS, matrixCompletedCount} from '../../shared/startupMatrix.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function answerHtml(blocks) {
    return (blocks || []).map(block => {
        const text = block.runs.map(run => {
            let text = escape(run.text);
            if (run.bold) text = `<strong>${text}</strong>`;
            if (run.italic) text = `<em>${text}</em>`;
            return text;
        }).join('');
        return `<p>${block.type === 'bullet' ? '• ' : ''}${text}</p>`;
    }).join('');
}

// Self-contained browser document: no scripts, remote assets or raw user HTML.
export function matrixExportHtml(eventName, teams, mentors = []) {
    const sections = teams.map(team => {
        const completed = matrixCompletedCount(team);
        const mentor = mentors.find(mentor => mentor.id === team.matrixMentorId);
        return `<article><header><h2>${escape(team.name)}</h2><p class="status">${completed === 10 ? 'Hotová' : completed ? 'Rozpracovaná' : 'Nevyplněná'} · ${completed}/10 odpovědí${mentor ? ` · Zpracoval/a: ${escape(mentor.name)}` : ''}</p></header><div class="matrix">${STARTUP_MATRIX_FIELDS.map(field => `<section><h3>${escape(field.label)}</h3><p class="prompt">${escape(field.prompt)}</p><div class="answer">${answerHtml(team.startupMatrix?.[field.key]) || '<p class="empty">Bez odpovědi.</p>'}</div></section>`).join('')}</div></article>`;
    }).join('');
    return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; form-action 'none'"><title>Startupové matice – ${escape(eventName)}</title><style>
    :root{color-scheme:light dark;font-family:'Public Sans',Arial,sans-serif;color:#172033;background:#f5f7fb}*{box-sizing:border-box}body{max-width:1200px;margin:auto;padding:24px}h1{color:#24528d}h2{margin:0;font-size:24px}h3{margin:0 0 10px;color:#24528d;font-size:13px}p{margin:8px 0;overflow-wrap:anywhere}article{background:white;border:1px solid #cbd5e1;border-radius:16px;margin:24px 0;overflow:hidden}header{padding:20px;background:#e3f4ff}.status,.prompt,.empty{color:#475569;font-size:13px}.matrix{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.matrix section{padding:18px;border:1px solid #e2e8f0;break-inside:avoid}.answer{white-space:pre-wrap;font-size:14px;line-height:1.5}footer{font-size:12px;color:#475569}
    @media(prefers-color-scheme:dark){:root{background:#111827;color:#f3f4f6}article{background:#1f2937;border-color:#475569}header{background:#183357}h1,h3{color:#b3d9ff}.status,.prompt,.empty,footer{color:#cbd5e1}.matrix section{border-color:#475569}}
    @media(max-width:640px){body{padding:12px}.matrix{grid-template-columns:1fr}}
    @media print{:root{color-scheme:light;background:white;color:#172033}body{padding:0;max-width:none}article{break-before:page;margin:0 0 20px;box-shadow:none}header{background:#e3f4ff;color:#172033}h1,h3{color:#24528d}.status,.prompt,.empty,footer{color:#475569}.matrix{grid-template-columns:repeat(2,minmax(0,1fr))}.matrix section{padding:12px;border-color:#cbd5e1}.answer{font-size:11px}.prompt{font-size:10px}}
    </style></head><body><h1>${escape(eventName)} · Startupové matice</h1><p>Otevřete v libovolném prohlížeči. Pro PDF použijte Tisk → Uložit jako PDF.</p>${sections}<footer>DashHack · Otázky CzechInvestu</footer></body></html>`;
}
