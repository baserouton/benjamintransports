// Client-side PDF generation for contracts and pending documents.
import { jsPDF } from "jspdf";
import type { Client, Rental, Vehicle } from "./data-store";
import { fmtMoney } from "./data-store";

type Lang = "pt" | "nl";

const L = {
  pt: {
    contractTitle: "CONTRATO DE LOCAÇÃO DE VEÍCULO",
    company: "Locadora Admin — Paramaribo, Suriname",
    parties: "PARTES",
    locadora: "LOCADORA",
    locatario: "LOCATÁRIO(A)",
    vehicle: "VEÍCULO",
    model: "Modelo",
    plate: "Placa",
    category: "Categoria",
    year: "Ano",
    terms: "CONDIÇÕES DA LOCAÇÃO",
    withdraw: "Data de retirada",
    ret: "Data de devolução",
    price: "Valor do aluguel",
    insurance: "Seguro adicional",
    deposit: "Caução",
    currency: "Moeda",
    clauses: "CLÁUSULAS",
    c1: "1. O(A) LOCATÁRIO(A) declara receber o veículo em perfeitas condições de uso, conforme vistoria de retirada anexa.",
    c2: "2. É de responsabilidade do(a) LOCATÁRIO(A) o abastecimento, limpeza e conservação do veículo durante o período de locação.",
    c3: "3. A devolução deverá ocorrer na data acordada, com tanque cheio e sem avarias. Em caso de não conformidade, será aplicada taxa adicional.",
    c4: "4. A caução será devolvida integralmente após vistoria de devolução, salvo desconto de avarias, multas ou taxas devidas.",
    c5: "5. Em caso de sinistro, o(a) LOCATÁRIO(A) deverá comunicar a LOCADORA em até 24 horas.",
    sign: "ASSINATURAS",
    date: "Paramaribo, ______ de ______________ de ______",
    sigLocadora: "LOCADORA",
    sigLocatario: "LOCATÁRIO(A)",
    doc: "Doc.",
    address: "Endereço",
    whatsapp: "WhatsApp",
    pendingTitle: "DOCUMENTO PENDENTE",
    pendingIntro: "Este documento aguarda ação da administração.",
    status: "Situação",
    generated: "Gerado em",
    ref: "Referência",
  },
  nl: {
    contractTitle: "HUURCONTRACT VOERTUIG",
    company: "Verhuur Admin — Paramaribo, Suriname",
    parties: "PARTIJEN",
    locadora: "VERHUURDER",
    locatario: "HUURDER",
    vehicle: "VOERTUIG",
    model: "Model",
    plate: "Kenteken",
    category: "Categorie",
    year: "Jaar",
    terms: "VOORWAARDEN",
    withdraw: "Ophaaldatum",
    ret: "Retourdatum",
    price: "Huurbedrag",
    insurance: "Aanvullende verzekering",
    deposit: "Borg",
    currency: "Valuta",
    clauses: "CLAUSULES",
    c1: "1. De HUURDER verklaart het voertuig in perfecte staat te hebben ontvangen, volgens bijgevoegde uitgifte-inspectie.",
    c2: "2. De HUURDER is verantwoordelijk voor brandstof, reiniging en onderhoud tijdens de huurperiode.",
    c3: "3. Retour dient plaats te vinden op de afgesproken datum, met volle tank en zonder schade. Bij non-conformiteit wordt een boete opgelegd.",
    c4: "4. De borg wordt volledig terugbetaald na retour-inspectie, behoudens aftrek van schade, boetes of verschuldigde kosten.",
    c5: "5. Bij een ongeval dient de HUURDER de VERHUURDER binnen 24 uur te informeren.",
    sign: "HANDTEKENINGEN",
    date: "Paramaribo, ______ ______________ ______",
    sigLocadora: "VERHUURDER",
    sigLocatario: "HUURDER",
    doc: "Doc.",
    address: "Adres",
    whatsapp: "WhatsApp",
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

export function generateContractPDF(
  rental: Rental,
  vehicle: Vehicle | undefined,
  client: Client | undefined,
  lang: Lang = "pt"
) {
  const l = L[lang];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, l.contractTitle, l.company);
  let y = 30;

  y = section(doc, y, l.parties);
  y = kv(doc, y, l.locadora, l.company);
  y = kv(doc, y, l.locatario, client?.nome ?? "—");
  y = kv(doc, y, `${l.doc} (RG/CPF)`, `${client?.rg ?? "—"} / ${client?.cpf ?? "—"}`);
  y = kv(doc, y, l.address, client?.endereco ?? "—");
  y = kv(doc, y, l.whatsapp, client?.whatsapp ?? "—");
  y += 2;

  y = section(doc, y, l.vehicle);
  y = kv(doc, y, l.model, vehicle?.modelo ?? "—");
  y = kv(doc, y, l.plate, vehicle?.placa ?? "—");
  y = kv(doc, y, l.category, vehicle?.categoria ?? "—");
  y = kv(doc, y, l.year, vehicle?.ano ? String(vehicle.ano) : "—");
  y += 2;

  y = section(doc, y, l.terms);
  y = kv(doc, y, l.withdraw, rental.dataRetirada);
  y = kv(doc, y, l.ret, rental.dataSaida);
  y = kv(doc, y, l.price, fmtMoney(rental.valorAluguel, rental.moeda));
  if (rental.seguroValor) y = kv(doc, y, l.insurance, fmtMoney(rental.seguroValor, rental.moeda));
  if (rental.caucaoValor) y = kv(doc, y, l.deposit, fmtMoney(rental.caucaoValor, rental.moeda));
  y = kv(doc, y, l.currency, rental.moeda);
  y += 2;

  y = section(doc, y, l.clauses);
  doc.setFontSize(9);
  const clauses = [l.c1, l.c2, l.c3, l.c4, l.c5];
  for (const c of clauses) {
    const lines = doc.splitTextToSize(c, 178);
    doc.text(lines, 17, y);
    y += lines.length * 4.5 + 1;
  }

  y = Math.max(y + 6, 235);
  y = section(doc, y, l.sign);
  doc.setFontSize(9);
  doc.text(l.date, 17, y);
  y += 20;
  doc.line(20, y, 90, y);
  doc.line(115, y, 190, y);
  doc.text(l.sigLocadora, 20, y + 5);
  doc.text(l.sigLocatario, 115, y + 5);

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`${l.ref}: ${rental.id}`, 15, 290);
  doc.text(`${l.generated}: ${new Date().toLocaleString(lang === "pt" ? "pt-BR" : "nl-NL")}`, 195, 290, { align: "right" });

  doc.save(`contrato-${vehicle?.placa ?? rental.id}.pdf`);
}

export function generatePendingDocPDF(label: string, ref: string, lang: Lang = "pt") {
  const l = L[lang];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, l.pendingTitle, l.company);
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
