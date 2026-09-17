// Generación de informes (PDF y Excel) a partir de los registros de un día.

function generarInformeExcel(registros, fechaISO) {
  const filas = registros
    .slice()
    .sort((a, b) => (a.area + a.hora).localeCompare(b.area + b.hora))
    .map(r => ({
      "AREA": r.area,
      "EQUIPO": r.equipo,
      "HORA": r.hora,
      "RESPONSABLE": r.responsable,
      "BUENO": r.novedad ? "" : "X",
      "MALO": r.novedad ? "X" : "",
      "TIPO DE NOVEDAD": r.tipoNovedad || "",
      "SE RECUPERA - SI": r.seRecupera === "SI" ? "X" : "",
      "SE RECUPERA - NO": r.seRecupera === "NO" ? "X" : "",
      "CAMBIO - SI": r.cambio === "SI" ? "X" : "",
      "CAMBIO - NO": r.cambio === "NO" ? "X" : "",
      "CANTIDAD ACEITE": r.cantidadAceite ? `${r.cantidadAceite} ${r.unidadAceite}` : "",
      "TIPO DE ACEITE": r.tipoAceite || "",
      "OBSERVACIONES": r.observaciones || ""
    }));

  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = [
    { wch: 16 }, { wch: 34 }, { wch: 8 }, { wch: 18 }, { wch: 7 }, { wch: 7 },
    { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 34 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Revision Niveles");
  XLSX.writeFile(wb, `Informe_Niveles_Aceite_${fechaISO}.xlsx`);
}

async function generarInformePDF(registros, fechaISO, nombrePlanta) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const azulOscuro = [18, 58, 94];
  const azul = [28, 90, 140];
  const verde = [30, 142, 90];
  const naranja = [217, 120, 46];
  const gris = [90, 100, 115];

  // --- Encabezado ---
  doc.setFillColor(...azulOscuro);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Revisión y Recuperación de Niveles de Aceite", marginX, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${nombrePlanta || "Planta"}  ·  Informe diario`, marginX, 48);

  const ordenados = registros.slice().sort((a, b) => (a.area + a.hora).localeCompare(b.area + b.hora));
  const buenos = ordenados.filter(r => !r.novedad).length;
  const novedades = ordenados.filter(r => r.novedad).length;
  const recuperados = ordenados.filter(r => r.seRecupera === "SI").length;
  const cambios = ordenados.filter(r => r.cambio === "SI").length;

  doc.setTextColor(...azulOscuro);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Fecha: ${formatoFechaLarga(fechaISO)}`, marginX, 96);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gris);
  doc.text(`Generado el ${new Date().toLocaleString("es-CO")}`, marginX, 110);

  // --- Resumen ---
  const resumen = [
    ["Equipos revisados", String(ordenados.length)],
    ["Sin novedad", String(buenos)],
    ["Con novedad", String(novedades)],
    ["Niveles recuperados", String(recuperados)],
    ["Cambios de aceite", String(cambios)]
  ];
  let boxW = (pageW - marginX * 2 - 4 * 8) / 5;
  resumen.forEach((r, i) => {
    const x = marginX + i * (boxW + 8);
    doc.setDrawColor(...azul);
    doc.setFillColor(238, 244, 250);
    doc.roundedRect(x, 122, boxW, 46, 6, 6, "F");
    doc.setTextColor(...azulOscuro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(r[1], x + boxW / 2, 144, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...gris);
    doc.text(r[0], x + boxW / 2, 158, { align: "center", maxWidth: boxW - 4 });
  });

  // --- Tabla principal ---
  const body = ordenados.map(r => [
    r.area, r.equipo, r.hora, r.responsable,
    r.novedad ? "Malo" : "Bueno",
    r.novedad ? (r.tipoNovedad || "-") : "-",
    r.seRecupera === "SI" ? "Sí" : "No",
    r.cambio === "SI" ? "Sí" : "No",
    r.observaciones || ""
  ]);
  doc.autoTable({
    startY: 184,
    margin: { left: marginX, right: marginX },
    head: [["Área", "Equipo", "Hora", "Responsable", "Estado", "Novedad", "Recupera", "Cambio", "Observaciones"]],
    body,
    styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: azulOscuro, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 55 }, 1: { cellWidth: 95 }, 2: { cellWidth: 32 }, 3: { cellWidth: 55 },
      4: { cellWidth: 32 }, 5: { cellWidth: 62 }, 6: { cellWidth: 38 }, 7: { cellWidth: 34 }, 8: { cellWidth: "auto" }
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        data.cell.styles.textColor = data.cell.raw === "Malo" ? naranja : verde;
        data.cell.styles.fontStyle = "bold";
      }
    }
  });

  // --- Evidencia fotográfica de novedades ---
  const conFotos = ordenados.filter(r => r.novedad && (r.fotoAntes || r.fotoDespues));
  if (conFotos.length) {
    doc.addPage();
    doc.setTextColor(...azulOscuro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Evidencia fotográfica de novedades", marginX, 40);
    let y = 60;
    const imgW = (pageW - marginX * 2 - 16) / 2;
    const imgH = imgW * 0.66;

    for (const r of conFotos) {
      if (y + imgH + 60 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        y = 40;
      }
      doc.setFillColor(...naranja);
      doc.roundedRect(marginX, y, pageW - marginX * 2, 20, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${r.area} · ${r.equipo}  —  ${r.hora}  —  ${r.tipoNovedad || "Novedad"}`, marginX + 8, y + 14);
      y += 28;

      const yImgTop = y;
      if (r.fotoAntes) {
        try { doc.addImage(r.fotoAntes, "JPEG", marginX, y, imgW, imgH); } catch (e) {}
        doc.setFontSize(7.5);
        doc.setTextColor(...gris);
        doc.setFont("helvetica", "normal");
        doc.text("Antes", marginX, y + imgH + 10);
      }
      if (r.fotoDespues) {
        try { doc.addImage(r.fotoDespues, "JPEG", marginX + imgW + 16, y, imgW, imgH); } catch (e) {}
        doc.setFontSize(7.5);
        doc.setTextColor(...gris);
        doc.text("Después", marginX + imgW + 16, y + imgH + 10);
      }
      y = yImgTop + imgH + 20;

      if (r.observaciones) {
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(`Obs: ${r.observaciones}`, pageW - marginX * 2);
        doc.text(lines, marginX, y);
        y += lines.length * 10 + 6;
      }
      y += 10;
    }
  }

  // --- Numeración de páginas ---
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...gris);
    doc.text(`Página ${i} de ${totalPaginas}`, pageW - marginX, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  doc.save(`Informe_Niveles_Aceite_${fechaISO}.pdf`);
}

function formatoFechaLarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
