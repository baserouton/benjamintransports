// Client-side PDF generation for contracts and pending documents.
import { jsPDF } from "jspdf";
import type { Client, Rental, Vehicle } from "./data-store";
import { fmtMoney } from "./data-store";

type Lang = "pt" | "nl";

const COMPANY = "BENJAMIN TRANSPORT N.V.";
const COMPANY_ADDRESS = "Copernicusstraat 173, Paramaribo, Suriname";
const COMPANY_KKF = "87747";

const L = {
  pt: {
    pendingTitle: "DOCUMENTO PENDENTE",
    pendingIntro: "Este documento aguarda ação da administração.",
    status: "Situação",
    generated: "Gerado em",
    ref: "Referência",
  },
  nl: {
    pendingTitle: "OPENSTAAND DOCUMENT",
    pendingIntro: "Dit document wacht op actie van de administratie.",
    status: "Status",
    generated: "Gegenereerd op",
    ref: "Referentie",
  },
} as const;

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 15, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, 15, 16);
  doc.setTextColor(0, 0, 0);
}

function section(doc: jsPDF, y: number, title: string) {
  doc.setFillColor(240, 240, 240);
  doc.rect(15, y, 180, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, 17, y + 4.2);
  doc.setFont("helvetica", "normal");
  return y + 10;
}

function kv(doc: jsPDF, y: number, k: string, v: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(k, 17, y);
  doc.setFont("helvetica", "normal");
  doc.text(v, 60, y);
  return y + 5;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function wrap(doc: jsPDF, text: string, y: number, size = 7.4) {
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, 178) as string[];
  doc.text(lines, 17, y);
  return y + lines.length * 3.4 + 0.8;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar a assinatura"));
    img.src = src;
  });
}

export async function generateContractPDF(
  rental: Rental,
  vehicle: Vehicle | undefined,
  client: Client | undefined,
  lang: Lang = "pt",
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, 210, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CONTRATO DE ALUGUEL DE VEÍCULOS / HUURCONTRACT VOOR VOERTUIGEN", 15, 11);
  doc.setTextColor(0, 0, 0);

  let y = 24;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("LOCADOR / VERHUURDER:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY, 62, y);
  y += 4.5;
  doc.setFont("helvetica", "bold");
  doc.text("ENDEREÇO / ADRES:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_ADDRESS, 62, y);
  y += 4.5;
  doc.setFont("helvetica", "bold");
  doc.text("KKF:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_KKF, 62, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("LOCATÁRIO / HUURDER:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(client?.nome ?? "—", 62, y);
  y += 4.5;
  doc.setFont("helvetica", "bold");
  doc.text("DOCUMENTO / IDENTITEIT:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${client?.rg ?? "—"} / ${client?.cpf ?? "—"}`, 62, y);
  y += 4.5;
  doc.setFont("helvetica", "bold");
  doc.text("ENDEREÇO / ADRES:", 15, y);
  doc.setFont("helvetica", "normal");
  const addr = doc.splitTextToSize(client?.endereco ?? "—", 128) as string[];
  doc.text(addr, 62, y);
  y += Math.max(4.5, addr.length * 4);
  doc.setFont("helvetica", "bold");
  doc.text("TELEFONE / TELEFOON:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(client?.whatsapp ?? "—", 62, y);
  y += 4.5;
  doc.setFont("helvetica", "bold");
  doc.text("VEÍCULO / VOERTUIG:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${vehicle?.modelo ?? "—"} · ${vehicle?.placa ?? "—"}${vehicle?.ano ? ` · ${vehicle.ano}` : ""}`,
    62,
    y,
  );
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CLÁUSULA 1 – OBJETO / ARTIKEL 1 – ONDERWERP", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  y = wrap(
    doc,
    "O presente contrato refere-se ao aluguel de veículos (carros e caminhões), podendo ser utilizados em áreas de garimpo sob responsabilidade do locatário. / Dit contract betreft de verhuur van voertuigen (auto's en vrachtwagens), die ook gebruikt mogen worden in goudmijngebieden onder verantwoordelijkheid van de huurder.",
    y,
  );
  doc.setFont("helvetica", "bold");
  doc.text("CLÁUSULA 2 – USO / ARTIKEL 2 – GEBRUIK", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  y = wrap(
    doc,
    "O locatário deve utilizar o veículo de forma responsável. / De huurder moet het voertuig op verantwoorde wijze gebruiken.",
    y,
  );
  doc.setFont("helvetica", "bold");
  doc.text("CLÁUSULA 3 – PROIBIÇÃO DE FUMAR / ARTIKEL 3 – ROOKVERBOD", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  y = wrap(doc, "É proibido fumar no veículo. / Roken in het voertuig is verboden.", y);
  doc.setFont("helvetica", "bold");
  doc.text("CLÁUSULA 4 – COMBUSTÍVEL / ARTIKEL 4 – BRANDSTOF", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  y = wrap(
    doc,
    "O veículo será entregue com tanque cheio e deve ser devolvido com tanque cheio. / Het voertuig wordt geleverd met een volle tank en moet met een volle tank worden teruggebracht.",
    y,
  );
  doc.setFont("helvetica", "bold");
  doc.text("CLÁUSULA 5 – LIMPEZA / ARTIKEL 5 – REINIGING", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  y = wrap(
    doc,
    "Veículo sujo: taxa de SRD 1.000. Uso em garimpo: taxa de SRD 6.000. / Vuil voertuig: SRD 1.000. Gebruik in goudmijngebied: SRD 6.000.",
    y,
  );
  doc.setFont("helvetica", "bold");
  doc.text("CLÁUSULA 6 – DANOS / ARTIKEL 6 – SCHADE", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  y = wrap(
    doc,
    "O locatário paga todos os custos de danos ou acidentes. / De huurder betaalt alle kosten bij schade of ongeval.",
    y,
  );
  doc.setFont("helvetica", "bold");
  doc.text("CLÁUSULA 7 – PRAZO / ARTIKEL 7 – PERIODE", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  y = wrap(
    doc,
    `Início / Start: ${formatDate(rental.dataRetirada)}     Fim / Einde: ${
      rental.prazoIndeterminado ? "indeterminado / onbepaald" : formatDate(rental.dataSaida)
    }`,
    y,
  );
  doc.setFont("helvetica", "bold");
  doc.text("CLÁUSULA 8 – VALOR / ARTIKEL 8 – PRIJS", 15, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  y = wrap(doc, `Valor / Prijs: ${fmtMoney(rental.valorAluguel, rental.moeda)}`, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ASSINATURAS / HANDTEKENINGEN", 15, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("LOCADOR / VERHUURDER", 17, y);
  doc.text("LOCATÁRIO / HUURDER", 115, y);
  y += 4;
  doc.setFontSize(7.5);
  doc.text(COMPANY, 17, y);

  if (rental.contratoAssinaturaUrl) {
    try {
      const img = await loadImage(rental.contratoAssinaturaUrl);
      doc.addImage(img, "PNG", 115, y - 2, 70, 28);
    } catch {
      doc.line(115, y + 22, 190, y + 22);
    }
  } else {
    doc.line(115, y + 22, 190, y + 22);
  }
  y += 32;
  doc.setFontSize(8);
  doc.text(`DATA / DATUM: ${formatDate(rental.dataRetirada)}`, 17, y);

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`Ref.: ${rental.id}`, 15, 290);
  doc.text(
    `${lang === "pt" ? "Gerado em" : "Gegenereerd op"}: ${new Date().toLocaleString(
      lang === "pt" ? "pt-BR" : "nl-NL",
    )}`,
    195,
    290,
    { align: "right" },
  );

  doc.save(`contrato-${vehicle?.placa ?? rental.id}.pdf`);
}

export function generatePendingDocPDF(label: string, ref: string, lang: Lang = "pt") {
  const l = L[lang];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, l.pendingTitle, COMPANY);
  let y = 32;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(label, 15, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(l.pendingIntro, 180), 15, y);
  y += 14;
  y = section(doc, y, l.status);
  y = kv(doc, y, l.ref, ref);
  y = kv(doc, y, l.generated, new Date().toLocaleString(lang === "pt" ? "pt-BR" : "nl-NL"));

  doc.save(`documento-${ref}.pdf`);
}
