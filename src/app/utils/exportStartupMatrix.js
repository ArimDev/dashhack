let templatePromise;
export async function downloadMatrixExport(eventName,teams,mentors=[]) {
    const { matrixExportXlsx } = await import('./startupMatrixXlsx.js');
    templatePromise ||= fetch('/templates/startup-matrix.json').then(response => {
        if (!response.ok) throw new Error('Šablonu se nepodařilo načíst.');
        return response.json();
    }).catch(error => { templatePromise=undefined; throw error; });
    const bytes=matrixExportXlsx(await templatePromise,eventName,teams,mentors);
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    const name=(teams.length===1?teams[0].name:eventName).replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,100)||'tymy';
    const link=document.createElement('a');link.href=url;link.download=`startupova-matice-${name}.xlsx`;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
