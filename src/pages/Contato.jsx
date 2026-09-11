import StaticPage from "./StaticPage.jsx";

export default function Contato() {
  return (
    <StaticPage title="Contato">
      <p>O Circular Notícias RJ está à disposição para dúvidas, sugestões, solicitações e propostas relacionadas à plataforma.</p>

      <p>
        E-mail: <a href="mailto:circularnoticias@gmail.com" style={linkStyle}>circularnoticias@gmail.com</a>
      </p>

      <h2 style={sectionStyle}>O que você pode nos enviar</h2>
      <p>Utilize nosso e-mail para assuntos como:</p>
      <ul style={{ paddingLeft: 20 }}>
        <li>dúvidas sobre o funcionamento da plataforma;</li>
        <li>sugestões de fontes ou de melhorias;</li>
        <li>questões relacionadas a conteúdos publicados por fontes acompanhadas pelo Circular;</li>
        <li>solicitações relacionadas a direitos autorais;</li>
        <li>
          solicitações relacionadas à{" "}
          <a href="/privacidade" style={linkStyle}>Política de Privacidade</a> e ao tratamento de dados
          pessoais;
        </li>
        <li>
          propostas de publicidade ou divulgação — veja também nossas páginas de{" "}
          <a href="/publicidade" style={linkStyle}>Publicidade</a> e{" "}
          <a href="/divulgue-sua-empresa" style={linkStyle}>Divulgue sua Empresa</a>;
        </li>
        <li>outras comunicações institucionais.</li>
      </ul>
      <p>
        Para agilizar o atendimento, recomendamos indicar no assunto do e-mail o motivo do contato (por
        exemplo: "Publicidade", "Direitos autorais", "Sugestão de fonte" ou "Privacidade").
      </p>

      <h3 style={subSectionStyle}>Modelo de mensagem</h3>
      <p>Para facilitar, você pode copiar o modelo abaixo, preencher os campos e enviar por e-mail:</p>
      <pre style={templateStyle}>
{`Assunto: [Motivo do contato — ex: Dúvida / Sugestão / Privacidade / Direitos autorais]

Nome:
E-mail para contato:
Motivo do contato:

Mensagem:
`}
      </pre>

      <h2 style={sectionStyle}>Prazo de resposta</h2>
      <p>
        Procuramos responder às mensagens recebidas dentro de um prazo razoável. O tempo de resposta pode
        variar conforme o volume de solicitações e a complexidade do assunto.
      </p>

      <h2 style={sectionStyle}>Sobre conteúdo de terceiros</h2>
      <p>
        Lembramos que grande parte das notícias apresentadas pelo Circular Notícias RJ é produzida por
        fontes externas. Questões relacionadas diretamente ao conteúdo, à apuração ou à redação de uma
        notícia específica podem, quando aplicável, ser direcionadas também ao veículo responsável pela
        publicação original. Saiba mais em nossos{" "}
        <a href="/termos-de-uso" style={linkStyle}>Termos de Uso</a>.
      </p>

      <p style={{ marginTop: 32, fontSize: 13, color: "#64748b" }}>
        Circular Notícias RJ
        <br />
        Centro de Inteligência de Notícias do Estado do Rio de Janeiro
        <br />
        A informação circula. Você decide o que ler.
        <br />
        <br />
        E-mail: circularnoticias@gmail.com
        <br />
        Diretor Responsável: Agnaldo Frederico
      </p>
    </StaticPage>
  );
}

const sectionStyle = { fontSize: 18, fontWeight: 700, color: "#1e293b", marginTop: 28, marginBottom: 10 };
const subSectionStyle = { fontSize: 15, fontWeight: 700, color: "#1e293b", marginTop: 20, marginBottom: 8 };
const linkStyle = { color: "#0ea5e9", fontWeight: 600, textDecoration: "none" };
const templateStyle = {
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "14px 16px",
  fontSize: 13,
  fontFamily: "monospace",
  whiteSpace: "pre-wrap",
  color: "#334155",
  overflowX: "auto",
};
  
