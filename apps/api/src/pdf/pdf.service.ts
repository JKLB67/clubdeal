import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface ContractData {
  investorFirstName: string;
  investorLastName: string;
  investorEmail: string;
  projectName: string;
  projectAddress: string;
  amount: number;
  annualYield: string;
  durationMonths: number;
  investmentId: string;
  date: string;
}

@Injectable()
export class PdfService {
  async generateContract(data: ContractData): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    const margin = 60;
    let y = height - margin;

    // WinAnsi ne supporte pas les caractères accentués ni les espaces insécables
    const ascii = (s: string) =>
      s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x00-\x7E]/g, '?');

    const draw = (text: string, x: number, yPos: number, size = 11, bold = false, color = rgb(0, 0, 0)) => {
      page.drawText(ascii(text), { x, y: yPos, size, font: bold ? fontBold : font, color });
    };

    // En-tête
    draw('CONTRAT DE SOUSCRIPTION', margin, y, 18, true, rgb(0.1, 0.33, 0.85));
    y -= 10;
    draw('Club Deal Immobilier', margin, y, 11, false, rgb(0.4, 0.4, 0.4));
    y -= 30;

    // Ligne séparatrice
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
    y -= 25;

    // Section investisseur
    draw('INVESTISSEUR', margin, y, 10, true, rgb(0.4, 0.4, 0.4));
    y -= 18;
    draw(`${data.investorFirstName} ${data.investorLastName}`, margin, y, 12, true);
    y -= 16;
    draw(data.investorEmail, margin, y, 11);
    y -= 30;

    // Section projet
    draw('PROJET', margin, y, 10, true, rgb(0.4, 0.4, 0.4));
    y -= 18;
    draw(data.projectName, margin, y, 12, true);
    y -= 16;
    draw(data.projectAddress, margin, y, 11);
    y -= 30;

    // Section financière
    draw('CONDITIONS FINANCIÈRES', margin, y, 10, true, rgb(0.4, 0.4, 0.4));
    y -= 18;

    const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
    const grossTotal = (data.amount * (parseFloat(data.annualYield) / 100) * (data.durationMonths / 12)).toFixed(0);
    const rows = [
      ['Montant investi',    `${fmt(data.amount)} EUR`],
      ['Rendement annuel',   `${data.annualYield}%`],
      ['Duree',              `${data.durationMonths} mois`],
      ['Rendement brut total', `${fmt(Number(grossTotal))} EUR`],
    ];

    for (const [label, value] of rows) {
      draw(label, margin, y, 11);
      draw(value, width / 2, y, 11, true);
      y -= 20;
    }

    y -= 20;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
    y -= 25;

    // Clauses
    draw('CLAUSES ET CONDITIONS', margin, y, 10, true, rgb(0.4, 0.4, 0.4));
    y -= 18;

    const clauses = [
      "L'investisseur reconnaît avoir pris connaissance des risques liés à l'investissement immobilier.",
      "Les rendements présentés sont indicatifs et ne constituent pas une garantie de performance.",
      "Le capital investi est bloqué pour la durée indiquée sauf cas de force majeure.",
      "Les plus-values sont soumises à la fiscalité en vigueur au moment du remboursement.",
    ];

    for (const clause of clauses) {
      const words = clause.split(' ');
      let line = '• ';
      for (const word of words) {
        if ((line + word).length > 75) {
          draw(line, margin, y, 9, false, rgb(0.3, 0.3, 0.3));
          y -= 14;
          line = '  ' + word + ' ';
        } else {
          line += word + ' ';
        }
      }
      if (line.trim()) {
        draw(line, margin, y, 9, false, rgb(0.3, 0.3, 0.3));
        y -= 14;
      }
      y -= 6;
    }

    y -= 20;

    // Zone signature
    draw('SIGNATURES', margin, y, 10, true, rgb(0.4, 0.4, 0.4));
    y -= 30;
    draw('Fait le ' + data.date, margin, y, 10);
    y -= 40;

    page.drawLine({ start: { x: margin, y }, end: { x: margin + 160, y }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
    page.drawLine({ start: { x: width / 2, y }, end: { x: width / 2 + 160, y }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
    y -= 14;
    draw("L'investisseur", margin, y, 9, false, rgb(0.5, 0.5, 0.5));
    draw('Le gestionnaire', width / 2, y, 9, false, rgb(0.5, 0.5, 0.5));

    // Pied de page
    draw(`Réf. souscription : ${data.investmentId}`, margin, 30, 8, false, rgb(0.6, 0.6, 0.6));

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }
}
