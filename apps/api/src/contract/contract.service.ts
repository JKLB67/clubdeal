import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

// ─── French number-to-words ───────────────────────────────────────────────────

function toFrenchWords(n: number): string {
  if (n === 0) return 'zéro';
  const units = [
    '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf',
  ];
  function b100(n: number): string {
    if (n < 20) return units[n];
    const t = Math.floor(n / 10), u = n % 10;
    if (t === 7) return u === 1 ? 'soixante-et-onze' : 'soixante-' + units[10 + u];
    if (t === 8) return u === 0 ? 'quatre-vingts' : 'quatre-vingt-' + units[u];
    if (t === 9) return 'quatre-vingt-' + units[10 + u];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
    if (u === 0) return tens[t];
    if (u === 1) return tens[t] + '-et-un';
    return tens[t] + '-' + units[u];
  }
  function b1000(n: number): string {
    if (n < 100) return b100(n);
    const h = Math.floor(n / 100), r = n % 100;
    const hs = h === 1 ? 'cent' : units[h] + ' cent' + (r === 0 ? 's' : '');
    return r === 0 ? hs : hs + ' ' + b100(r);
  }
  function convert(n: number): string {
    if (n >= 1_000_000) {
      const m = Math.floor(n / 1_000_000), r = n % 1_000_000;
      return (m === 1 ? 'un million' : b1000(m) + ' millions') + (r > 0 ? ' ' + convert(r) : '');
    }
    if (n >= 1000) {
      const k = Math.floor(n / 1000), r = n % 1000;
      return (k === 1 ? 'mille' : b1000(k) + ' mille') + (r > 0 ? ' ' + b1000(r) : '');
    }
    return b1000(n);
  }
  return convert(n);
}

function euroInWords(euros: number): string {
  const formatted = euros.toLocaleString('fr-FR');
  return `${toFrenchWords(euros)} euros (${formatted} €)`;
}

function ordinalRank(n: number): string {
  if (n === 1) return '1';
  return String(n);
}

// ─── HTML base styles ────────────────────────────────────────────────────────

function buildWatermark(text: string): string {
  const safe = text.replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const svgRow = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'>` +
    `<text x='250' y='250' fill='rgba(0,0,0,0.055)' font-size='34' font-weight='bold' ` +
    `font-family='Arial,sans-serif' text-anchor='middle' dominant-baseline='middle' ` +
    `transform='rotate(-42,250,250)'>${safe}</text></svg>`,
  );
  return `url("data:image/svg+xml,${svgRow}")`;
}

function buildStyle(watermarkText: string, isSigned: boolean): string {
  // Watermark: toujours présent — "BROUILLON" avant signature, "CONFIDENTIEL" après
  const wmLabel = isSigned ? 'CONFIDENTIEL' : watermarkText;
  const wm = buildWatermark(wmLabel);
  const bgRule = 'background-image:' + wm + ';background-size:500px 500px;';
  // Protection copie : toujours active, signé ou non
  const antiCopyScript = [
    '<script>',
    "document.addEventListener('contextmenu',function(e){e.preventDefault();});",
    "document.addEventListener('keydown',function(e){",
    "  if((e.ctrlKey||e.metaKey)&&['c','a','s','p','u'].indexOf(e.key.toLowerCase())>-1)e.preventDefault();",
    "});",
    "document.addEventListener('dragstart',function(e){e.preventDefault();});",
    '</script>',
  ].join('\n');

  return [
    '<style>',
    '  *{box-sizing:border-box;margin:0;padding:0;-webkit-user-select:none;user-select:none;}',
    "  body{font-family:'Times New Roman',Times,serif;font-size:var(--fs,11pt);line-height:1.6;",
    '       color:#000;background:#fff;padding:40px 60px;max-width:800px;margin:0 auto;' + bgRule + '}',
    '  h1{font-size:14pt;text-align:center;text-transform:uppercase;font-weight:bold;margin-bottom:24px;}',
    '  h2{font-size:11pt;font-weight:bold;margin:20px 0 8px;text-transform:uppercase;}',
    '  h3{font-size:11pt;font-weight:bold;margin:14px 0 6px;}',
    '  p{margin:6px 0;text-align:justify;}',
    '  .section{margin:16px 0;}',
    '  .between{font-weight:bold;text-align:center;margin:16px 0;}',
    '  .party{margin:12px 0;}',
    '  .party strong{display:block;}',
    '  .italic{font-style:italic;}',
    '  .center{text-align:center;}',
    '  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;}',
    '  .sig-block{border-top:1px solid #000;padding-top:12px;}',
    '  .sig-block p{margin:4px 0;font-size:10pt;}',
    '  .stamp{border:1px solid #ccc;min-height:80px;margin-top:12px;',
    '         display:flex;align-items:center;justify-content:center;',
    '         color:#aaa;font-size:9pt;font-style:italic;}',
    '  .stamp.signed{border-color:#1a56db;color:#1a56db;font-style:normal;font-weight:bold;font-size:10pt;}',
    '  .separator{border:none;border-top:1px solid #ccc;margin:20px 0;}',
    '  ol{padding-left:20px;margin:6px 0;}',
    '  ol li{margin:4px 0;}',
    '  @media print{body{padding:20px 40px;}.no-print{display:none;}}',
    '</style>',
    antiCopyScript,
  ].join('\n');
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ContractService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ── Fetch all data needed to generate both docs ───────────────────────────

  async getInvestmentData(investmentId: string) {
    const inv = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        user: { include: { physicalProfile: true, legalProfile: true } },
        project: { include: { contractConfig: true } },
      },
    });
    if (!inv) throw new NotFoundException('Investissement introuvable');

    const entity = await this.prisma.tenantEntity.findUnique({
      where: { tenantId: inv.tenantId },
    });

    return { inv, entity };
  }

  // ── Build obligataire block from investor profile ─────────────────────────

  private buildObligataire(inv: any) {
    const u = inv.user;
    if (u.profileType === 'LEGAL' && u.legalProfile) {
      const lp = u.legalProfile;
      return {
        isLegal: true,
        name: lp.companyName,
        legalForm: lp.legalForm ?? 'SAS',
        capitalStr: '1 000 €',
        address: lp.registeredAddress ?? '',
        rcsCity: '',
        rcsNumber: lp.siren ?? '',
        representative: '',
        representativeTitle: 'Président',
      };
    }
    const pp = u.physicalProfile;
    const fullName = pp ? `${pp.firstName} ${pp.lastName}` : u.email;
    const address = pp ? [pp.addressLine1, pp.postalCode, pp.city].filter(Boolean).join(', ') : '';
    return {
      isLegal: false,
      name: fullName,
      legalForm: null,
      capitalStr: null,
      address,
      rcsCity: null,
      rcsNumber: null,
      representative: fullName,
      representativeTitle: null,
    };
  }

  // ── Emitter block ─────────────────────────────────────────────────────────

  private buildEmitter(entity: any) {
    return {
      name: entity?.name || 'JKLB',
      legalForm: entity?.legalForm || 'SAS',
      capital: entity?.capital || 1000,
      address: entity?.address || '',
      rcsCity: entity?.rcsCity || 'Strasbourg',
      rcsNumber: entity?.rcsNumber || '',
      representative: entity?.representative || '',
      representativeTitle: entity?.representativeTitle || 'Directeur Général',
      signatureCity: entity?.signatureCity || 'Strasbourg',
    };
  }

  // ── Config with defaults ──────────────────────────────────────────────────

  private buildConfig(project: any) {
    const c = project.contractConfig;
    return {
      priorityRank: c?.priorityRank ?? 1,
      minGuaranteedRate: Number(c?.minGuaranteedRate ?? 6),
      guaranteedPeriodMonths: c?.guaranteedPeriodMonths ?? 3,
      monthlyComplementaryRate: Number(c?.monthlyComplementaryRate ?? 2),
      contractualCapRate: Number(c?.contractualCapRate ?? 22),
      propertyDescription: c?.propertyDescription || project.address,
      massRepresentative: c?.massRepresentative || '',
      competentCourt: c?.competentCourt || 'Strasbourg',
      earlyRepaymentNoticeDays: c?.earlyRepaymentNoticeDays ?? 7,
      latePaymentPenaltyPoints: c?.latePaymentPenaltyPoints ?? 5,
      durationMonths: project.durationMonths,
    };
  }

  // ─── BULLETIN DE SOUSCRIPTION ─────────────────────────────────────────────

  async generateBulletin(investmentId: string): Promise<string> {
    const { inv, entity } = await this.getInvestmentData(investmentId);
    const emitter = this.buildEmitter(entity);
    const obligataire = this.buildObligataire(inv);
    const amountEuros = Number(inv.amount) / 100;
    const signDate = inv.bulletinSignedAt
      ? inv.bulletinSignedAt.toLocaleDateString('fr-FR')
      : new Date().toLocaleDateString('fr-FR');
    const isSigned = !!inv.bulletinSignedAt;
    const watermarkText = `${emitter.name} – BROUILLON`;
    const style = buildStyle(watermarkText, isSigned);

    const obligataireDesc = obligataire.isLegal
      ? `<strong>${obligataire.name},</strong> société ${obligataire.legalForm} au capital social de ${obligataire.capitalStr}, dont le siège social est situé au ${obligataire.address}${obligataire.rcsCity ? `, immatriculée au RCS de ${obligataire.rcsCity} sous le numéro ${obligataire.rcsNumber}` : ''}, représentée par ${obligataire.representative} en qualité de ${obligataire.representativeTitle} déclarant avoir tous pouvoirs à l'effet des présentes.`
      : `<strong>${obligataire.name},</strong> demeurant au ${obligataire.address}.`;

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Bulletin de Souscription</title>${style}</head>
<body>
<h1>Bulletin de Souscription</h1>

<div class="section">
<p>Le soussigné :</p>
<div class="party" style="margin:16px 0;">
  <p>${obligataireDesc}</p>
</div>

<p>déclare expressément avoir été valablement informé(e) des conditions et modalités de l'émission projetée,</p>

<p style="margin-top:12px;">pour un montant maximal de <strong>${euroInWords(amountEuros)}</strong>, de <strong>${toFrenchWords(amountEuros)} (${amountEuros.toLocaleString('fr-FR')})</strong> obligations simples d'une valeur nominale d'un (1) euro à libérer en numéraire de la société <strong>${emitter.name}</strong>, société ${emitter.legalForm} au capital social de ${emitter.capital.toLocaleString('fr-FR')} €, dont le siège social est situé ${emitter.address}, immatriculée au RCS de ${emitter.rcsCity} sous le numéro ${emitter.rcsNumber}, représentée par M. ${emitter.representative} agissant en qualité de ${emitter.representativeTitle} déclarant avoir tous pouvoirs à l'effet des présentes (la « Société ») ;</p>

<p style="margin-top:12px;">déclare par le présent bulletin,</p>
<ol style="margin:8px 0 8px 24px;">
  <li>souscrire ce jour un nombre total de <strong>${amountEuros.toLocaleString('fr-FR')} Obligations</strong> de la Société ;</li>
  <li>adhérer pleinement et sans restriction au Contrat annexé au présent bulletin de souscription ; et</li>
  <li>payer le prix de souscription des Obligations souscrites, en totalité en numéraire, par virement.</li>
</ol>

<p>Les termes et expressions utilisés dans le présent bulletin ont le sens qui leur est attribué dans le Contrat.</p>
<p>Une copie électronique du présent bulletin a été remise au soussigné qui le reconnaît expressément.</p>
</div>

<hr class="separator">

<div class="signatures">
  <div class="sig-block">
    <p>Fait à ${emitter.signatureCity}</p>
    <p>Le ${signDate}</p>
    <br>
    <p>${obligataire.isLegal ? `La société ${obligataire.name}` : ''}</p>
    ${obligataire.isLegal ? `<p>Représentée par ${obligataire.representative}</p><p>${obligataire.representativeTitle}</p>` : `<p>${obligataire.name}</p>`}
    <div class="stamp ${isSigned ? 'signed' : ''}">
      ${isSigned ? `✓ Signé électroniquement le ${signDate}` : 'Signature de l\'obligataire'}
    </div>
  </div>
</div>

<div class="no-print" style="margin-top:32px;padding:16px;background:#f0f4ff;border-radius:8px;font-family:sans-serif;font-size:10pt;">
  <strong>Référence investissement :</strong> ${investmentId}
</div>
</body></html>`;
  }

  // ─── CONTRAT D'ÉMISSION D'OBLIGATIONS ────────────────────────────────────

  async generateContrat(investmentId: string): Promise<string> {
    const { inv, entity } = await this.getInvestmentData(investmentId);
    const emitter = this.buildEmitter(entity);
    const obligataire = this.buildObligataire(inv);
    const config = this.buildConfig(inv.project);
    const amountEuros = Number(inv.amount) / 100;
    const emissionDate = (inv.bulletinSignedAt ?? inv.createdAt).toLocaleDateString('fr-FR');
    const signDate = new Date().toLocaleDateString('fr-FR');
    const isInvestorSigned = !!inv.contratInvestorSignedAt;
    const isEmitterSigned = !!inv.contratEmitterSignedAt;
    const investorSignDate = inv.contratInvestorSignedAt?.toLocaleDateString('fr-FR') ?? signDate;
    const emitterSignDate = inv.contratEmitterSignedAt?.toLocaleDateString('fr-FR') ?? signDate;

    const isFullySigned = isInvestorSigned && isEmitterSigned;
    const watermarkText = `${emitter.name} – BROUILLON`;
    const style = buildStyle(watermarkText, isFullySigned);
    const rankLabel = `Rang ${ordinalRank(config.priorityRank)}`;

    const obligataireBlock = obligataire.isLegal
      ? `<strong>${obligataire.name},</strong> société ${obligataire.legalForm} au capital social de ${obligataire.capitalStr}, dont le siège social est situé au ${obligataire.address}${obligataire.rcsCity ? `, immatriculée au RCS de ${obligataire.rcsCity} sous le numéro ${obligataire.rcsNumber}` : ''}, représentée par ${obligataire.representative} en qualité de ${obligataire.representativeTitle} déclarant avoir tous pouvoirs à l'effet des présentes.`
      : `<strong>${obligataire.name},</strong> demeurant au ${obligataire.address}.`;

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Contrat d'Émission d'Obligations</title>${style}</head>
<body>
<h1>Contrat d'Émission d'Obligations</h1>

<p class="between">ENTRE LES SOUSSIGNÉS :</p>

<div class="party">
  <p><strong>${emitter.legalForm} ${emitter.name}</strong>, société ${emitter.legalForm} au capital social de ${emitter.capital.toLocaleString('fr-FR')} €, dont le siège social est situé ${emitter.address}, immatriculée au RCS de ${emitter.rcsCity} sous le numéro ${emitter.rcsNumber}, représentée par M. ${emitter.representative} agissant en qualité de ${emitter.representativeTitle} déclarant avoir tous pouvoirs à l'effet des présentes.</p>
  <p class="italic" style="margin-top:6px;"><strong><em>Ci-après désigné « L'Émetteur »</em></strong></p>
  <p>D'une part,</p>
</div>

<p class="between">ET :</p>

<div class="party">
  <p>${obligataireBlock}</p>
  <p class="italic" style="margin-top:6px;"><strong><em>Ci-après désigné « L'Obligataire »</em></strong></p>
  <p>D'autre part,</p>
</div>

<p>Ci-après désignés individuellement une <em>« Partie »</em> et collectivement les <em>« Parties »</em>.</p>

<hr class="separator">

<h2>Après avoir été exposé que :</h2>

<div class="section">
<p><strong>1/</strong><br>
L'Émetteur exerce l'activité de marchand de biens, l'acquisition, l'administration et l'exploitation par bail, location ou autrement de tous les immeubles bâtis ou non bâtis, ainsi que toutes opérations immobilières, financières et mobilières s'y rattachant directement ou indirectement.</p>

<p style="margin-top:10px;"><strong>2/</strong><br>
À la date des présentes, les actionnaires de la société ${emitter.name} détiennent 100 % des actions nominatives et droits de vote et financiers au sein de ladite société.</p>

<p style="margin-top:10px;"><strong>3/</strong><br>
À la date des présentes, la société ${emitter.name} n'a souscrit dans le cadre du projet défini à l'article 7 du préambule aucun contrat d'émission d'obligations en cours de rang 1 ou d'emprunt qui n'auraient pas fait l'objet d'un remboursement intégral.</p>

<p style="margin-top:10px;"><strong>4/</strong><br>
À la date des présentes, la société ${emitter.name} (i) a déposé conformément à l'article L228-39 du Code de commerce au moins deux bilans régulièrement approuvés par les actionnaires, de sorte qu'elle n'est pas tenue de faire précéder la signature de la présente convention d'une vérification de l'actif et du passif de la société, (ii) a entièrement libéré son capital social.</p>

<p style="margin-top:10px;"><strong>5/</strong><br>
La durée de la société ${emitter.name} est fixée à 99 ans à compter de la date de son immatriculation au RCS.</p>

<p style="margin-top:10px;"><strong>6/</strong><br>
La société est dirigée par son Président, associé ou non, désigné par décision de l'associé unique ou par décision collective des associés, nommé sans limitation de durée.</p>

<p style="margin-top:10px;"><strong>7/</strong><br>
L'Émetteur souhaite financer une partie des fonds du programme immobilier situé ${config.propertyDescription}, au moyen notamment de l'émission d'un emprunt obligataire (l' <strong>« Opération de financement »</strong>) d'un montant maximal de <strong>${euroInWords(amountEuros)}</strong> (l' <strong>« Emprunt Obligataire »</strong>) et d'une durée maximale de <strong>${toFrenchWords(config.durationMonths)} (${config.durationMonths}) mois</strong> qui sera souscrit par l'Obligataire, selon les termes du présent Contrat et sous réserve des conditions qui y sont prévues.</p>

<p style="margin-top:10px;">Les Parties déclarent et reconnaissent que la négociation ayant précédé la conclusion de la présente convention a été conduite de bonne foi et avoir bénéficié, pendant la phase précontractuelle de négociations de toutes les informations nécessaires et utiles pour leur permettre de s'engager en toute connaissance de cause.</p>
</div>

<p class="center" style="margin:20px 0;font-weight:bold;">Il a été convenu et arrêté ce qui suit :</p>

<hr class="separator">

<h2>Article 1 – Objet du contrat</h2>
<p>La présente convention a pour objet le financement exclusif du bien immobilier désigné sous les références : ${config.propertyDescription}.</p>
<p>Faute pour l'Émetteur d'acquérir le ou les biens visés à l'alinéa précédent, l'Obligataire serait alors immédiatement fondé à solliciter le remboursement des fonds objet du présent contrat.</p>

<h2>Article 2 – Durée du contrat</h2>
<p>La présente convention est conclue pour une durée de <strong>${toFrenchWords(config.durationMonths)} (${config.durationMonths}) mois</strong> à compter de la date d'émission des obligations, renouvelable pour une même durée par tacite reconduction.</p>

<h2>Article 3 – Modalités de souscription des obligations</h2>
<p>Pour la parfaite exécution des présentes, les Parties signeront à la date des présentes un bulletin de souscription, l'Obligataire procédant au règlement du montant des Obligations dans les conditions définies à l'article 4 des présentes.</p>

<h2>Article 4 – Prix des Obligations émises</h2>
<p>Les Obligations objet des présentes sont émises pour un montant total maximum de <strong>${euroInWords(amountEuros)}</strong>, soit <strong>un euro (1 €)</strong> par obligation à la Date d'émission.</p>

<h2>Article 5 – Absence de faculté de conversion des Obligations en Actions</h2>
<p>Les Parties conviennent qu'aucune faculté de conversion des Obligations en Actions de la société Émettrice n'est prévue aux termes de la présente Convention.</p>

<h2>Article 6 – Modalités de remboursement des Obligations émises</h2>

<h3>6.1 Modalités générales</h3>
<p>L'Émetteur procèdera au remboursement des Obligations émises au plus tard le dernier jour de la durée du contrat telle que définie à l'article 2, et à tout instant en cas de survenance d'un cas de remboursement anticipé obligatoire.</p>
<p>Avant cette date, l'Obligataire ne pourra solliciter le remboursement anticipé de tout ou partie du montant maximal des Obligations souscrites, sauf accord écrit et préalable de l'Émetteur.</p>

<h3>6.2 Priorité de remboursement – ${rankLabel}</h3>
<p>L'Obligataire bénéficie d'un droit prioritaire de remboursement de <strong>${rankLabel}</strong> sur les autres Obligataires éventuels non parties à la présente convention.</p>
<p>En conséquence, l'Émetteur procèdera au remboursement en priorité par rapport aux Obligataires éventuels de rang inférieur.</p>
${config.priorityRank > 1 ? `<p>Toute émission d'Obligations par l'Émetteur postérieure aux présentes, qu'elles soient émises au bénéfice de l'Obligataire ou de tiers, donneront lieu à une priorité de remboursement par l'Émetteur d'un rang inférieur.</p>` : ''}

<h3>6.3 Remboursement anticipé volontaire</h3>
<p>Sous réserve du mécanisme prévu à l'article 6.2, l'Émetteur pourra procéder si bon lui semble au remboursement anticipé volontaire de l'intégralité du montant maximal des Obligations émises sans frais ni pénalités à condition de respecter un délai de prévenance de <strong>${toFrenchWords(config.earlyRepaymentNoticeDays)} (${config.earlyRepaymentNoticeDays}) jours</strong> avant le remboursement anticipé volontaire.</p>

<h3>6.4 Remboursement anticipé obligatoire</h3>
<p>En cas d'envoi d'une Notification d'Exigibilité Anticipée dans les conditions de l'Article 12, l'Émetteur devra procéder au remboursement anticipé des Obligations émises au plus tard dix (10) Jours Ouvrés après réception de ladite Notification.</p>

<h3>6.4.1 Changement de contrôle</h3>
<p>En cas de changement de contrôle de la société Émettrice, l'Émetteur devra procéder à la date de survenance dudit changement de contrôle au remboursement anticipé de l'intégralité des obligations souscrites en circulation.</p>

<h3>6.4.2 Changement de management</h3>
<p>En cas de changement de management de la société Émettrice, l'Émetteur devra procéder à la date de survenance dudit changement au remboursement anticipé de l'intégralité des obligations souscrites en circulation.</p>

<h3>6.4.3 Vente du bien</h3>
<p>En cas de vente du bien ou du terrain visé par le préambule 7/ des présentes avant le terme du contrat, l'Émetteur devra procéder au remboursement anticipé de l'intégralité des Obligations souscrites dans un délai de cinq (5) jours ouvrés à compter de la réception du prix de vente.</p>

<h2>Article 7 – Intérêts de l'Emprunt Obligataire</h2>

<h3>7.1 Taux d'intérêt – principe général</h3>
<p>(i) <strong>Intérêt minimum garanti</strong><br>
Un intérêt forfaitaire irréductible égal à <strong>${toFrenchWords(config.minGuaranteedRate)} pourcent (${config.minGuaranteedRate}%)</strong> du montant nominal des Obligations souscrites est définitivement acquis à compter de la Date d'Émission, et ce quelle que soit la date effective de remboursement, y compris en cas de remboursement anticipé intervenant avant l'expiration d'un délai de <strong>${toFrenchWords(config.guaranteedPeriodMonths)} (${config.guaranteedPeriodMonths}) mois</strong> à compter de ladite Date d'Émission.</p>

<p style="margin-top:8px;">(ii) <strong>Intérêt complémentaire mensuel</strong><br>
À compter du premier jour du <strong>${toFrenchWords(config.guaranteedPeriodMonths + 1)}${config.guaranteedPeriodMonths + 1 === 4 ? 'ième' : 'ème'} (${config.guaranteedPeriodMonths + 1}ème) mois</strong> suivant la Date d'Émission, les Obligations porteront, en sus du Taux Minimum Garanti, un intérêt complémentaire calculé au taux de <strong>${toFrenchWords(config.monthlyComplementaryRate)} pourcent (${config.monthlyComplementaryRate}%)</strong> par mois entier ou commencé, chaque mois étant indivisible.</p>

<h3>7.2 Modalités de calcul – exigibilité</h3>
<p>Les intérêts sont calculés sur la base du montant nominal des Obligations en circulation et courent de la Date d'Émission jusqu'à la date de remboursement effectif inclus. Tout mois commencé est réputé entier. Les intérêts sont capitalisés et payables en une seule fois à la Date de Remboursement Effectif, sans paiement intermédiaire.</p>

<h3>7.3 Plafonnement contractuel</h3>
<p>Les Parties conviennent expressément que le taux global d'intérêt toutes composantes confondues est strictement plafonné à <strong>${toFrenchWords(config.contractualCapRate)} pourcent (${config.contractualCapRate}%)</strong> du montant nominal des Obligations sur la durée maximale du contrat (le « Plafond Contractuel »). En aucun cas le montant total des intérêts dus ne pourra excéder le Plafond Contractuel.</p>

<h3>7.4 Échéance – durée maximale</h3>
<p>La durée maximale de l'emprunt obligataire est fixée à <strong>${toFrenchWords(config.durationMonths)} (${config.durationMonths}) mois</strong> à compter de la Date d'Émission (l'« Échéance Contractuelle »). Toute demande de prorogation postérieure devra faire l'objet d'un accord écrit préalable entre l'Émetteur et les obligataires.</p>

<h3>7.5 Défaut de remboursement – intérêts de retard</h3>
<p>En cas de non-remboursement à l'Échéance Contractuelle, les sommes dues porteront intérêts de retard de plein droit, sans mise en demeure préalable. Le taux des intérêts de retard est égal au taux d'intérêt contractuel applicable majoré de <strong>${toFrenchWords(config.latePaymentPenaltyPoints)} (${config.latePaymentPenaltyPoints}) points de pourcentage</strong> l'an, calculé prorata temporis sur la base d'une année de 365 jours.</p>

<h2>Article 8 – Modalités de paiement</h2>
<p>L'Obligataire procédera au paiement du prix des Obligations sur le compte bancaire de l'Émetteur en euros dont les coordonnées lui seront préalablement communiquées. Le remboursement des sommes dues s'effectuera sur le compte de l'Obligataire, dont les coordonnées lui seront préalablement communiquées.</p>
<p>Si la date de paiement n'est pas un jour ouvré, le paiement sera reporté au jour ouvré suivant, sauf si celui-ci se situe dans le mois calendaire suivant, auquel cas la date sera fixée au jour ouvré précédent.</p>

<h2>Article 9 – Forme – Transfert</h2>
<p>Les Obligations sont créées exclusivement sous la forme nominative et seront inscrites dans le registre des porteurs d'obligations de l'Émetteur. Les Obligations sont librement cessibles par chaque Obligataire à toute société sur laquelle il exerce un Contrôle et qui n'est pas domiciliée dans un pays ou territoire figurant sur la liste des États ou Territoires Non Coopératifs.</p>

<h2>Article 10 – Engagements de l'Émetteur</h2>
<p>À compter de la Date de Signature et jusqu'à ce que toutes les Sommes Dues aient été intégralement payées et remboursées, l'Émetteur prend les engagements figurant ci-dessous à l'égard des Obligataires.</p>

<h3>10.1 Notifications d'événements</h3>
<p>Sans délai, dès qu'il en aura connaissance, l'Émetteur s'engage à informer le Représentant de la Masse de la survenance de tout Cas de Défaut ou Cas de Défaut Potentiel, de tout cas de Remboursement Anticipé Obligatoire, de toute modification dans la répartition du capital, ou de tout sinistre affectant les actifs de la société entraînant une perte supérieure à cinquante mille euros (50 000 €).</p>

<h3>10.2 Réunions d'information</h3>
<p>L'Émetteur s'engage à organiser une réunion d'information avec le Représentant de la Masse dans un délai maximum de six (6) mois suivant la clôture de chaque exercice social et d'une façon globale tous les mois.</p>

<h3>10.3 Engagement de communication</h3>
<p>L'Émetteur s'engage à remettre au Représentant de la Masse les comptes annuels certifiés dans les 120 jours calendaires suivant la clôture de l'exercice.</p>

<h3>10.4 Engagements de faire</h3>
<p>L'Émetteur s'engage à maintenir son existence, son objet social, sa forme juridique et son siège social, ainsi qu'à respecter les dispositions législatives et réglementaires qui lui sont applicables.</p>

<h3>10.5 Engagements de ne pas faire</h3>
<p>L'Émetteur s'engage à ne pas réduire son capital social, à ne pas annuler ou racheter tout ou partie des actions composant son capital, et à ne pas fusionner avec une entité extérieure au groupe sans accord préalable des obligataires.</p>

<h2>Article 11 – Cas de Défaut</h2>
<p>Constitue un Cas de Défaut : (a) le non-paiement à son échéance de toute Somme Due, sauf retard purement technique corrigé dans les cinq (5) Jours Ouvrés ; (b) l'ouverture d'une Procédure Collective à l'encontre de l'Émetteur.</p>

<h2>Article 12 – Conséquences en cas de Cas de Défaut</h2>
<p>En cas de survenance d'un Cas de Défaut, le Représentant de la Masse pourra déclarer l'exigibilité anticipée de tout ou partie des Sommes Dues, sept (7) Jours Ouvrés après l'envoi d'une mise en demeure restée sans effet.</p>

<h2>Article 13 – Représentation des Obligataires</h2>
<p>Conformément aux dispositions de l'article L. 228-46 du Code de Commerce, les Obligataires seront groupés de plein droit en une masse (la « Masse »). ${config.massRepresentative ? `L'Émetteur a désigné <strong>${config.massRepresentative}</strong> en qualité de Représentant de la Masse.` : 'Le Représentant de la Masse sera désigné par acte séparé.'}</p>
<p>Les assemblées générales des Obligataires sont appelées à autoriser toutes modifications du présent Contrat. Elles délibèrent à la majorité des deux tiers (2/3) des voix.</p>

<h2>Article 14 – Notification</h2>
<p>Toute communication entre l'Émetteur et les Obligataires sera réputée valablement faite par courrier électronique, télécopie ou par lettre recommandée avec demande d'avis de réception adressée au siège social ou au domicile respectif de chaque Partie.</p>

<h2>Article 15 – Non renonciation</h2>
<p>Aucun obligataire ni le représentant de la masse ne sera considéré comme ayant renoncé à un droit du seul fait qu'il s'abstienne de l'exercer ou l'exerce tardivement ou partiellement.</p>

<h2>Article 16 – Déclaration d'indépendance réciproque</h2>
<p>Les Parties déclarent expressément qu'elles sont et demeureront, pendant toute la durée du présent contrat, des partenaires indépendants, assurant chacun les risques de sa propre activité.</p>

<h2>Article 17 – Comportement loyal et de bonne foi</h2>
<p>Les Parties s'engagent à toujours se comporter l'une envers l'autre comme des partenaires loyaux et de bonne foi.</p>

<h2>Article 18 – Confidentialité et sécurité des données personnelles</h2>
<p>Les Parties s'engagent à respecter le caractère confidentiel du Contrat, des Documents de Financement et des informations reçues. Les données personnelles ne seront utilisées que dans le cadre du contrat et non à d'autres fins, conformément au RGPD.</p>

<h2>Article 19 – Stipulations expresses</h2>
<p>Le présent Contrat entre en vigueur à la Date de Signature et prend fin à la date de remboursement de l'ensemble des Obligations. Les Parties renoncent expressément aux dispositions de l'article 1195 du Code Civil.</p>

<h2>Article 20 – Nullité et indépendance des clauses</h2>
<p>L'annulation éventuelle d'une ou plusieurs clauses par une décision de justice ne saurait porter atteinte à ses autres stipulations qui continueront de produire leur plein et entier effet.</p>

<h2>Article 21 – Documents annexes</h2>
<p>Tous les documents annexés au présent contrat en font partie intégrante et forment, avec celui-ci, un ensemble indivisible dans l'esprit des parties.</p>

<h2>Article 22 – Clause attributive de juridiction</h2>
<p>TOUS LES LITIGES AUXQUELS LE PRÉSENT CONTRAT POURRAIT DONNER LIEU SERONT SOUMIS AU <strong>TRIBUNAL JUDICIAIRE DE ${config.competentCourt.toUpperCase()}</strong>.</p>

<h2>Article 23 – Élection de domicile</h2>
<p>Pour les besoins des présentes, les parties font élection de domicile aux adresses indiquées en tête des présentes. Toute modification de domicile devra être signifiée par lettre recommandée avec demande d'avis de réception.</p>

<h2>Article 24 – Signature électronique</h2>
<p>Les Parties ont accepté expressément de signer les présentes par voie de signature électronique au sens des dispositions des articles 1367 et suivants du Code civil. La version électronique des présentes constitue l'original du document et est parfaitement valable et opposable entre elles.</p>

<hr class="separator">

<p>Fait à ${emitter.signatureCity},</p>
<p>Par signature électronique,</p>

<div class="signatures">
  <div class="sig-block">
    <p><strong>Pour l'Émetteur,</strong></p>
    <p>La société ${emitter.name},</p>
    <p>M. ${emitter.representative}</p>
    <p>${emitter.representativeTitle}</p>
    <div class="stamp ${isEmitterSigned ? 'signed' : ''}">
      ${isEmitterSigned ? `✓ Signé électroniquement le ${emitterSignDate}` : 'Signature de l\'émetteur (admin)'}
    </div>
  </div>
  <div class="sig-block">
    <p><strong>Pour l'Obligataire,</strong></p>
    ${obligataire.isLegal ? `<p>La société ${obligataire.name},</p><p>${obligataire.representative}</p><p>${obligataire.representativeTitle}</p>` : `<p>${obligataire.name}</p>`}
    <div class="stamp ${isInvestorSigned ? 'signed' : ''}">
      ${isInvestorSigned ? `✓ Signé électroniquement le ${investorSignDate}` : 'Signature de l\'obligataire'}
    </div>
  </div>
</div>

<div class="no-print" style="margin-top:32px;padding:16px;background:#f0f4ff;border-radius:8px;font-family:sans-serif;font-size:10pt;">
  <strong>Référence investissement :</strong> ${investmentId} | <strong>Date d'émission :</strong> ${emissionDate}
</div>
</body></html>`;
  }

  // ─── Signature actions ────────────────────────────────────────────────────

  // Ordre de signature : 1) contrat investor → 2) bulletin → PENDING_PAYMENT + notif admin

  async signContratInvestor(userId: string, investmentId: string) {
    const inv = await this.prisma.investment.findFirst({
      where: { id: investmentId, userId },
    });
    if (!inv) throw new NotFoundException('Investissement introuvable');
    if (inv.contratInvestorSignedAt) return { ok: true, alreadySigned: true };

    return this.prisma.investment.update({
      where: { id: investmentId },
      data: { contratInvestorSignedAt: new Date() },
    });
  }

  async signBulletin(userId: string, investmentId: string) {
    const inv = await this.prisma.investment.findFirst({
      where: { id: investmentId, userId },
      include: { project: true, user: true },
    });
    if (!inv) throw new NotFoundException('Investissement introuvable');
    if (!inv.contratInvestorSignedAt) throw new NotFoundException('Le contrat doit être signé en premier');
    if (inv.bulletinSignedAt) return { ok: true, alreadySigned: true };

    const updated = await this.prisma.investment.update({
      where: { id: investmentId },
      data: {
        bulletinSignedAt: new Date(),
        status: 'PENDING_PAYMENT',
        esignSignedAt: new Date(),
      },
    });

    // Notify admin to co-sign the contrat
    const adminUsers = await this.prisma.user.findMany({
      where: { tenantId: inv.tenantId, role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    });
    const entity = await this.prisma.tenantEntity.findUnique({ where: { tenantId: inv.tenantId } });
    for (const admin of adminUsers) {
      await this.email.send(
        admin.email,
        `Signature requise – Contrat d'émission – ${inv.project.name}`,
        `<p>Bonjour,</p>
         <p>L'obligataire <strong>${inv.user.email}</strong> vient de signer les deux documents pour le projet <strong>${inv.project.name}</strong>.</p>
         <p>En votre qualité d'émetteur (${entity?.name ?? ''}), vous devez maintenant co-signer le contrat d'émission depuis le back-office.</p>
         <p><a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/admin/projects/${inv.projectId}?tab=investors">Accéder au back-office →</a></p>`,
      );
    }

    return updated;
  }

  async signContratEmitter(adminTenantId: string, investmentId: string) {
    const inv = await this.prisma.investment.findFirst({
      where: { id: investmentId, tenantId: adminTenantId },
      include: { user: true, project: true },
    });
    if (!inv) throw new NotFoundException('Investissement introuvable');
    if (!inv.contratInvestorSignedAt) throw new NotFoundException('L\'obligataire n\'a pas encore signé');
    if (inv.contratEmitterSignedAt) return { ok: true, alreadySigned: true };

    const updated = await this.prisma.investment.update({
      where: { id: investmentId },
      data: { contratEmitterSignedAt: new Date() },
    });

    // Notify investor
    await this.email.send(
      inv.user.email,
      `Contrat signé – ${inv.project.name}`,
      `<p>Bonjour,</p>
       <p>Votre contrat d'émission d'obligations pour le projet <strong>${inv.project.name}</strong> a été co-signé par l'émetteur.</p>
       <p>Les deux parties ont signé. Votre dossier est maintenant complet.</p>`,
    );

    return updated;
  }
}
