let templatePromise;
export async function downloadMatrixExport(eventName,teams,mentors=[],format='xlsx') {
    if(format==='html') {
        const {matrixExportHtml}=await import('./startupMatrixHtml.js');
        return downloadFile(matrixExportHtml(eventName,teams,mentors),'text/html;charset=utf-8','html',eventName,teams);
    }
    const { matrixExportXlsx } = await import('./startupMatrixXlsx.js');
    templatePromise ||= fetch('/templates/startup-matrix.json').then(response => {
        if (!response.ok) throw new Error('Šablonu se nepodařilo načíst.');
        return response.json();
    }).catch(error => { templatePromise=undefined; throw error; });
    const bytes=matrixExportXlsx(await templatePromise,eventName,teams,mentors);
    downloadFile(bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx',eventName,teams);
}
function downloadFile(bytes,type,extension,eventName,teams) {
    const url=URL.createObjectURL(new Blob([bytes],{type}));
    const name=(teams.length===1?teams[0].name:eventName).replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,100)||'tymy';
    const link=document.createElement('a');link.href=url;link.download=`startupova-matice-${name}.${extension}`;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
