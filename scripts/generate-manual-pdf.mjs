import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "docs/manual-operacional-locadora-admin.pdf");
const logo = readFileSync(
  "/Users/rhafaeloliveira/.cursor/projects/Users-rhafaeloliveira-Desktop-PROJETOS-ATUAIS-projetosuriname/assets/Captura_de_Tela_2026-07-28_a_s_09.37.29-4241c66a-f9c4-4bbc-b737-b76001ffdc33.png",
);
mkdirSync(dirname(output), { recursive: true });

const pdf = new jsPDF({ unit: "mm", format: "a4" });
const colors = {
  navy: [7, 14, 24],
  blue: [25, 45, 75],
  gold: [213, 173, 29],
  lightGold: [250, 244, 222],
};
const page = { width: 210, height: 297, left: 18, right: 18, top: 30, bottom: 20 };
let y = page.top;
let sectionNumber = 0;

function header() {
  pdf.setFillColor(...colors.navy);
  pdf.rect(0, 0, page.width, 18, "F");
  pdf.addImage(logo, "PNG", 143, 3, 49, 14);
  pdf.setDrawColor(...colors.gold);
  pdf.setLineWidth(0.55);
  pdf.line(page.left, 20.5, page.width - page.right, 20.5);
}

function footer() {
  const current = pdf.getNumberOfPages();
  pdf.setDrawColor(...colors.gold);
  pdf.line(page.left, 282, page.width - page.right, 282);
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.blue);
  pdf.text("BR-Tecnologias | Manual operacional - Locadora Admin", page.left, 287);
  pdf.text(`Pagina ${current}`, page.width - page.right, 287, { align: "right" });
}

function nextPage() {
  footer();
  pdf.addPage();
  y = page.top;
  header();
}

function ensure(height) {
  if (y + height > page.height - page.bottom) nextPage();
}

function title(text, subtitle) {
  ensure(24);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...colors.blue);
  pdf.text(text, page.left, y);
  y += 7;
  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(85);
    pdf.text(subtitle, page.left, y);
    y += 8;
  }
  pdf.setDrawColor(...colors.gold);
  pdf.setLineWidth(0.7);
  pdf.line(page.left, y, page.width - page.right, y);
  y += 7;
}

function section(text, subtitle) {
  sectionNumber += 1;
  if (y > 245) nextPage();
  pdf.setFillColor(...colors.lightGold);
  pdf.roundedRect(page.left, y - 5, 174, 10, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...colors.blue);
  pdf.setFontSize(13);
  pdf.text(`${sectionNumber}. ${text}`, page.left + 4, y + 1);
  y += 9;
  if (subtitle) {
    paragraph(subtitle, { color: 95, size: 9 });
  }
}

function paragraph(text, { color = 45, size = 10, indent = 0, gap = 4 } = {}) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(size);
  pdf.setTextColor(color);
  const lines = pdf.splitTextToSize(text, 174 - indent);
  ensure(lines.length * (size * 0.42) + gap);
  pdf.text(lines, page.left + indent, y);
  y += lines.length * (size * 0.42) + gap;
}

function bullets(items) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.7);
  pdf.setTextColor(45);
  for (const item of items) {
    const lines = pdf.splitTextToSize(item, 164);
    ensure(lines.length * 4.3 + 3);
    pdf.setFillColor(...colors.gold);
    pdf.circle(page.left + 2, y - 1.1, 1, "F");
    pdf.text(lines, page.left + 7, y);
    y += lines.length * 4.3 + 2.3;
  }
  y += 2;
}

function steps(items) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.7);
  for (let index = 0; index < items.length; index += 1) {
    const lines = pdf.splitTextToSize(items[index], 158);
    ensure(lines.length * 4.3 + 5);
    pdf.setFillColor(...colors.gold);
    pdf.circle(page.left + 4, y - 1.2, 3.3, "F");
    pdf.setTextColor(255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(String(index + 1), page.left + 4, y + 1, { align: "center" });
    pdf.setTextColor(45);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.7);
    pdf.text(lines, page.left + 10, y);
    y += lines.length * 4.3 + 3;
  }
  y += 2;
}

function note(label, text) {
  const lines = pdf.splitTextToSize(text, 158);
  ensure(lines.length * 4.2 + 12);
  pdf.setFillColor(255, 248, 224);
  pdf.roundedRect(page.left, y - 4, 174, lines.length * 4.2 + 8, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(115, 78, 0);
  pdf.text(label, page.left + 5, y + 1);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(85, 65, 25);
  pdf.text(lines, page.left + 5, y + 6);
  y += lines.length * 4.2 + 12;
}

// Capa
pdf.setFillColor(...colors.navy);
pdf.rect(0, 0, page.width, page.height, "F");
pdf.setFillColor(...colors.blue);
pdf.circle(180, 44, 52, "F");
pdf.circle(27, 270, 46, "F");
pdf.addImage(logo, "PNG", page.left, 25, 105, 30);
pdf.setTextColor(255);
pdf.setFont("helvetica", "bold");
pdf.setFontSize(30);
pdf.text("LOCADORA", page.left, 92);
pdf.text("ADMIN", page.left, 105);
pdf.setFont("helvetica", "normal");
pdf.setFontSize(14);
pdf.text("Manual operacional do sistema", page.left, 120);
pdf.setDrawColor(...colors.gold);
pdf.line(page.left, 132, 135, 132);
pdf.setFontSize(10);
pdf.text("Guia de uso para apresentacao ao cliente", page.left, 145);
pdf.text(`Versao 1.0 | ${new Date().toLocaleDateString("pt-BR")}`, page.left, 153);
pdf.setFontSize(8);
pdf.text("Gestao de frota, clientes, locacoes, manutencao e financeiro.", page.left, 265);
pdf.addPage();
y = page.top;
header();

title("Como usar este manual", "Ordem recomendada para operar a locadora com seguranca.");
paragraph(
  "Este material explica o objetivo de cada tela, o que preencher e a sequencia de trabalho recomendada. O sistema registra atividades de login, navegacao e alteracoes para apoiar a auditoria da operacao.",
);
section("Fluxo principal da operacao");
steps([
  "Cadastre o veiculo antes de oferecelo para locacao. Confirme modelo, placa, categoria e ano.",
  "Cadastre o cliente e confira os dados de contato e documentos exigidos.",
  "Crie a locacao selecionando somente veiculos disponiveis, definindo datas, valores e moeda.",
  "Na retirada, abra a locacao e marque como entregue. Gere o contrato para assinatura.",
  "Na devolucao, preencha a vistoria final, incluindo tanque, limpeza, avarias, observacoes e eventual taxa.",
  "Registre manutencoes sempre que ocorrerem; os custos alimentam automaticamente a visao financeira.",
  "Acompanhe alertas, saldos, seguros, documentos pendentes e logs diariamente.",
]);
note("IMPORTANTE", "Use valores na moeda correta (SRD, USD ou EUR). O painel apresenta cada moeda separadamente; nao some moedas diferentes como se fossem o mesmo valor.");

section("Acesso e navegacao");
bullets([
  "Na tela de login, informe o Login e a Senha recebidos. Se houver erro, revise ambos os campos e tente novamente.",
  "A barra lateral e o menu principal: Painel, Veiculos, Clientes, Locacoes, Manutencao e Financeiro.",
  "O grupo administrativo inclui Usuarios, Documentos, Atividades e Configuracoes.",
  "No topo da tela, use o seletor PT/NL para idioma, o icone de sol/lua para tema e o icone de sair para encerrar a sessao.",
]);

section("Painel inicial", "Visao executiva da operacao.");
bullets([
  "Os indicadores exibem total de veiculos, locacoes ativas, receita e documentos pendentes.",
  "O grafico de receita por veiculo ajuda a identificar quais placas geram maior faturamento.",
  "Atividades recentes mostram os ultimos eventos registrados no sistema.",
  "Use os atalhos no rodape para cadastrar rapidamente veiculo, cliente ou locacao.",
]);

section("Veiculos - lista e consulta");
bullets([
  "Use a busca por modelo ou placa para localizar um item rapidamente.",
  "Filtre por categoria (Vans, Carros, Particular ou Picape) e por status: todos, disponiveis ou alugados.",
  "Os cards mostram ocupacao, disponibilidade e alertas de seguro vencido ou proximo do vencimento.",
  "Clique na linha do veiculo para consultar a ficha, fotos, historico e informacoes relacionadas.",
]);
note("BOA PRATICA", "Antes de criar uma nova locacao, confirme que o veiculo aparece como disponivel e que o seguro esta regular.");

section("Novo veiculo", "Cadastro da frota.");
steps([
  "Abra Veiculos e clique em Novo.",
  "Preencha Modelo com uma identificacao clara, por exemplo: Toyota Hilux 2023.",
  "Informe a Placa. O sistema converte o texto para letras maiusculas.",
  "Escolha a Categoria correta e preencha o Ano quando disponivel.",
  "Anexe fotos para visualizacao durante o cadastro e clique em Salvar.",
]);
note("ATENCAO", "Na versao atual, as fotos selecionadas servem como visualizacao no momento do cadastro; para guarda permanente deve ser configurado um servico de armazenamento de arquivos.");

section("Clientes - lista e consulta");
bullets([
  "Use a busca por nome, CPF ou WhatsApp e filtre a base por Suriname ou BR.",
  "Os indicadores resumem total de clientes, origem e pendencias documentais.",
  "Clique em um cliente para ver seus dados cadastrais, documentos informados e historico de locacoes.",
  "Priorize a regularizacao dos clientes indicados com documentos pendentes antes de liberar uma locacao.",
]);

section("Novo cliente", "Cadastro de dados e documentos.");
steps([
  "Abra Clientes e clique em Novo.",
  "Preencha Nome completo. Informe RG, CPF, endereco e WhatsApp sempre que disponiveis.",
  "E-mail e opcional, mas recomendado para comunicacao e envio de documentos.",
  "Marque a opcao Suriname quando o cliente for do pais. Isso libera os campos de Passaporte e Identiteitskaart.",
  "Anexe CNH; para clientes do Suriname, anexe tambem passaporte e identiteitskaart. Clique em Salvar.",
]);
note("CONFERENCIA", "Antes de contratar, compare os dados digitados com os documentos apresentados pelo cliente.");

section("Locacoes - acompanhamento");
bullets([
  "A tela resume locacoes em curso, pendentes de retirada, devolvidas, vencimentos proximos e atrasos.",
  "Use as abas de status para filtrar: Pendente, Entregue ou Devolvido.",
  "A busca encontra locacoes por placa, modelo do veiculo ou nome do cliente.",
  "Abra a locacao pela linha correspondente para executar as etapas de entrega e devolucao.",
]);

section("Nova locacao", "Registro comercial e reserva.");
steps([
  "Abra Locacoes e clique em Novo.",
  "Selecione o Veiculo. Apenas veiculos disponiveis sao exibidos.",
  "Selecione o Cliente ja cadastrado.",
  "Informe data de retirada e data de devolucao. A devolucao deve ser posterior a retirada.",
  "Informe o valor do aluguel e escolha a moeda: SRD, USD ou EUR.",
  "Preencha seguro, caucao e observacao do seguro quando aplicavel. Salve a locacao.",
]);
note("RESULTADO", "Ao salvar, a locacao fica pendente. O veiculo sera tratado como indisponivel quando a retirada for confirmada.");

section("Detalhe da locacao - retirada, contrato e devolucao");
bullets([
  "O topo informa status, periodo, cliente, placa e progresso da locacao.",
  "Em Valores, revise aluguel, seguro, caucao e total a receber antes da retirada.",
  "Com status Pendente, gere o contrato em PDF, realize a vistoria de retirada e clique em Marcar como entregue.",
  "Com status Entregue, acompanhe o prazo. O painel destaca devolucoes proximas e atrasadas.",
  "Na devolucao, preencha a vistoria: tanque, limpeza, sem avarias, observacoes e taxa, se houver. Entao conclua a devolucao.",
  "Depois de devolvida, a locacao e encerrada e o veiculo volta a ficar disponivel.",
]);
note("VISTORIA", "Registre avarias e taxas com descricao objetiva. Isso cria historico e facilita a conferencia da caucao.");

section("Manutencao", "Controle de custos e saude da frota.");
bullets([
  "A tela apresenta totais por moeda, proporcao de preventivas e corretivas, veiculos com maior custo e itens que exigem atencao.",
  "Use abas para tipo de manutencao, filtro por moeda e busca por peca, modelo ou placa.",
  "O bloco de atencao identifica veiculos sem manutencao recente e reincidencia de manutencoes corretivas.",
]);
steps([
  "Clique em Novo.",
  "Selecione o veiculo, o tipo (Preventiva ou Corretiva), as pecas ou servicos executados e o custo.",
  "Escolha a moeda, informe a data real do servico e acrescente observacoes relevantes.",
  "Clique em Salvar. O custo passa a compor o financeiro automaticamente.",
]);

section("Financeiro", "Leitura de receitas, despesas e alertas.");
bullets([
  "Os tres cards principais mostram saldo, entradas e despesas separadamente para SRD, USD e EUR.",
  "Use o periodo Hoje, Semana ou Mes como referencia visual do painel.",
  "Filtre os lancamentos por moeda, tipo (entrada ou despesa) e texto de busca.",
  "Consulte os veiculos com melhor resultado liquido e os alertas de seguros vencidos ou proximos do vencimento.",
  "Entradas de locacoes e despesas de manutencao sao registradas pelo fluxo operacional; confirme os dados na origem.",
]);
note("ANALISE", "O saldo positivo em uma moeda nao compensa automaticamente saldo negativo em outra. Avalie cada moeda separadamente.");

section("Usuarios", "Consulta de contas internas.");
bullets([
  "A tela lista Login, Nome, E-mail, Perfil e Status.",
  "As contas exibidas possuem acesso total no sistema atual.",
  "Use esta tela para conferir se uma conta esta ativa antes de compartilhar o acesso.",
]);

section("Documentos", "Geracao de contratos e pendencias.");
steps([
  "Abra Documentos para visualizar todas as locacoes cadastradas.",
  "Localize a locacao pelo veiculo, placa, cliente e periodo.",
  "Clique em PDF para gerar o contrato em formato pronto para baixar ou imprimir.",
  "Na area Documentos pendentes, gere os modelos indicados enquanto o documento definitivo nao estiver disponivel.",
]);

section("Atividades (logs)", "Auditoria e exportacao.");
bullets([
  "A tela registra login, navegacao, cliques, cadastros, manutencoes e preferencias.",
  "Filtre por usuario, categoria ou termo de busca para encontrar um evento.",
  "Clique em uma linha para consultar o detalhe do registro.",
  "Use o botao CSV para baixar os resultados filtrados e apresentar ou arquivar a auditoria.",
]);

section("Configuracoes", "Preferencias locais do operador.");
bullets([
  "Perfil: permite alterar o nome e e-mail exibidos na tela; clique em Salvar para confirmar.",
  "Idioma: alterne entre Portugues (BR) e Nederlands.",
  "Tema: selecione Claro ou Escuro conforme preferencia de visualizacao.",
]);
note("ENCERRAMENTO", "Ao terminar o uso, clique no icone de sair no canto superior direito. Evite deixar a sessao aberta em computador compartilhado.");

section("Rotina diaria recomendada");
steps([
  "Inicio do dia: consulte Painel, alertas de seguro, locacoes com devolucao hoje e atrasos.",
  "Antes de cada retirada: valide cliente, documentos, veiculo, valores, caucao e contrato.",
  "No retorno: execute a vistoria, registre taxas quando aplicavel e conclua a devolucao.",
  "Ao receber nota ou oficina: lance a manutencao no mesmo dia.",
  "Fim do dia: revise Financeiro, documentos pendentes e Atividades; exporte CSV quando necessario.",
]);

footer();
pdf.setProperties({
  title: "Manual operacional - Locadora Admin",
  subject: "Guia de uso do sistema",
  author: "Locadora Admin",
});
pdf.save(output);
console.log(output);
