// Client-side PDF generation for contracts and pending documents.
import { jsPDF } from "jspdf";
import { COUPON_KIND_LABELS, type Client, type Coupon, type Rental, type Vehicle } from "./data-store";
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

function yn(value: boolean) {
  return value ? "Sim / Ja" : "Não / Nee";
}

function couponEnsurePage(doc: jsPDF, y: number, needed = 16) {
  if (y + needed < 280) return y;
  doc.addPage();
  return 20;
}

export function generateCouponPDF(coupon: Coupon, lang: Lang = "pt") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const p = coupon.payload;
  const kind = COUPON_KIND_LABELS[coupon.tipo];
  const locale = lang === "pt" ? "pt-BR" : "nl-NL";

  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CUPOM / BON", 15, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${coupon.codigo}  ·  ${kind.pt} / ${kind.nl}`, 15, 16);
  doc.setTextColor(0, 0, 0);

  let y = 30;
  y = section(doc, y, "EMPRESA / BEDRIJF");
  y = kv(doc, y, "Nome / Naam", COMPANY);
  y = kv(doc, y, "Endereço / Adres", COMPANY_ADDRESS);
  y = kv(doc, y, "KKF", COMPANY_KKF);
  y = kv(doc, y, "Emitido / Uitgegeven", new Date(coupon.createdAt.replace(" ", "T")).toLocaleString(locale));
  y = kv(doc, y, "Atendente / Medewerker", coupon.emitidoPor);
  if (p.locacaoRef) y = kv(doc, y, "Locação / Verhuur", p.locacaoRef);

  if (p.cliente) {
    y = couponEnsurePage(doc, y, 28);
    y = section(doc, y, "CLIENTE / KLANT");
    y = kv(doc, y, "Nome / Naam", p.cliente.nome || "—");
    if (p.cliente.rg || p.cliente.cpf) {
      y = kv(doc, y, "Documento / ID", `${p.cliente.rg || "—"} / ${p.cliente.cpf || "—"}`);
    }
    if (p.cliente.endereco) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Endereço / Adres", 17, y);
      doc.setFont("helvetica", "normal");
      const addr = doc.splitTextToSize(p.cliente.endereco, 128) as string[];
      doc.text(addr, 60, y);
      y += Math.max(5, addr.length * 4);
    }
    if (p.cliente.whatsapp) y = kv(doc, y, "WhatsApp", p.cliente.whatsapp);
    if (p.cliente.email) y = kv(doc, y, "E-mail", p.cliente.email);
  }

  if (p.veiculo) {
    y = couponEnsurePage(doc, y, 22);
    y = section(doc, y, "VEÍCULO / VOERTUIG");
    y = kv(
      doc,
      y,
      "Modelo / Model",
      `${p.veiculo.modelo} · ${p.veiculo.placa}${p.veiculo.ano ? ` · ${p.veiculo.ano}` : ""}`,
    );
    y = kv(doc, y, "Categoria / Categorie", p.veiculo.categoria);
  }

  if (p.periodo) {
    y = couponEnsurePage(doc, y, 24);
    y = section(doc, y, "PERÍODO / PERIODE");
    y = kv(doc, y, "Início / Start", formatDate(p.periodo.retirada));
    y = kv(
      doc,
      y,
      "Fim / Einde",
      p.periodo.indeterminado ? "Indeterminado / Onbepaald" : formatDate(p.periodo.saida),
    );
    y = kv(doc, y, "Dias / Dagen", String(p.periodo.dias));
  }

  if (p.translato) {
    y = couponEnsurePage(doc, y, 22);
    y = section(doc, y, "TRANSLATO");
    y = kv(doc, y, "Tipo / Type", p.translato.tipoServico);
    y = kv(doc, y, "Destino / Bestemming", p.translato.destino);
    y = kv(doc, y, "Data / Datum", formatDate(p.translato.data));
  }

  if (p.vistoria) {
    y = couponEnsurePage(doc, y, 32);
    y = section(doc, y, "VISTORIA / INSPECTIE");
    y = kv(doc, y, "Tanque cheio / Volle tank", yn(p.vistoria.tanque));
    y = kv(doc, y, "Limpo / Schoon", yn(p.vistoria.limpo));
    y = kv(doc, y, "Sem avarias / Geen schade", yn(p.vistoria.semAvarias));
    if (p.vistoria.km != null) {
      y = kv(doc, y, "Km saída / Km start", p.vistoria.km.toLocaleString(locale));
    }
    if (p.vistoria.kmVolta != null) {
      y = kv(doc, y, "Km volta / Km retour", p.vistoria.kmVolta.toLocaleString(locale));
    }
    if (p.vistoria.kmRodados != null) {
      y = kv(doc, y, "Km rodados / Gereden", p.vistoria.kmRodados.toLocaleString(locale));
    }
    if (p.vistoria.obs) y = kv(doc, y, "Obs.", p.vistoria.obs);
  }

  y = couponEnsurePage(doc, y, 20 + p.itens.length * 8);
  y = section(doc, y, "ITENS / POSTEN");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(lang === "pt" ? "Descrição" : "Omschrijving", 17, y);
  doc.text("Qtd", 130, y);
  doc.text("Unit.", 148, y);
  doc.text("Total", 178, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");
  for (const item of p.itens) {
    y = couponEnsurePage(doc, y, 10);
    const label = lang === "pt" ? item.descricao : item.descricaoNl;
    const lines = doc.splitTextToSize(label, 108) as string[];
    doc.text(lines, 17, y);
    if (item.quantidade != null) doc.text(String(item.quantidade), 130, y);
    if (item.unitario != null) doc.text(fmtMoney(item.unitario, coupon.moeda), 148, y);
    doc.text(fmtMoney(item.total, coupon.moeda), 195, y, { align: "right" });
    y += Math.max(6, lines.length * 4);
  }

  if (p.caucao) {
    y = couponEnsurePage(doc, y, 12);
    doc.setFontSize(8);
    doc.setTextColor(90);
    const cauStatus =
      p.caucao.status === "devolvido" ? "devolvida / vrijgegeven" : "retida / aangehouden";
    doc.text(
      `Caução / Borg (não faturada): ${fmtMoney(p.caucao.valor, coupon.moeda)} — ${cauStatus}`,
      17,
      y,
    );
    doc.setTextColor(0, 0, 0);
    y += 7;
  }

  y = couponEnsurePage(doc, y, 22);
  doc.setFillColor(20, 20, 20);
  doc.rect(15, y, 180, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", 17, y + 8);
  doc.text(fmtMoney(coupon.total, coupon.moeda), 193, y + 8, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 18;

  if (p.observacao) {
    y = couponEnsurePage(doc, y, 14);
    y = section(doc, y, "OBSERVAÇÃO / OPMERKING");
    y = wrap(doc, p.observacao, y, 8);
  }

  y = couponEnsurePage(doc, y, 18);
  doc.setFontSize(7.2);
  doc.setTextColor(90);
  const footer = p.contratoAssinadoEm
    ? `Este cupom refere-se ao pagamento do serviço. As regras de uso estão no contrato assinado em ${p.contratoAssinadoEm}. / Deze bon betreft de betaling van de dienst. De gebruiksvoorwaarden staan in het contract ondertekend op ${p.contratoAssinadoEm}.`
    : "Este cupom refere-se ao pagamento do serviço. As regras de uso estão no contrato de locação. / Deze bon betreft de betaling van de dienst. De gebruiksvoorwaarden staan in het huurcontract.";
  y = wrap(doc, footer, y, 7.2);

  doc.setFontSize(7);
  doc.text(`Ref.: ${coupon.id}`, 15, 290);
  doc.text(`${lang === "pt" ? "Gerado em" : "Gegenereerd op"}: ${new Date().toLocaleString(locale)}`, 195, 290, {
    align: "right",
  });

  const slug = (p.veiculo?.placa ?? p.translato?.destino ?? coupon.codigo).replace(/\s+/g, "-");
  doc.save(`cupom-${coupon.codigo}-${slug}.pdf`);
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
