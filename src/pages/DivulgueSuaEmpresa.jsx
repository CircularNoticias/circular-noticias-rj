import StaticPage from "./StaticPage.jsx";

export default function DivulgueSuaEmpresa() {
  return (
    <StaticPage title="Divulgue sua Empresa">
      <p style={{ fontStyle: "italic" }}>Sua empresa também pode fazer parte do que circula.</p>

      <p>Todos os dias, informações circulam pelo Estado do Rio de Janeiro.</p>
      <p>
        Notícias, acontecimentos, serviços, iniciativas e oportunidades chegam a pessoas de diferentes
        regiões e municípios.
      </p>
      <p>E a sua empresa? Já está sendo encontrada por esse público?</p>

      <p>
        "Divulgue sua empresa" é o espaço do Circular Notícias RJ pensado especialmente para pequenos e
        médios negócios, comerciantes, profissionais e iniciativas locais que desejam ser conhecidos pelo
        público de sua própria região.
      </p>

      <h2 style={sectionStyle}>Um espaço pensado para o negócio local</h2>
      <p>
        Diferente de uma campanha publicitária tradicional, "Divulgue sua empresa" foi criado para
        aproximar o Circular daquilo que também faz parte do cotidiano das regiões que cobrimos: os
        comércios, profissionais e empreendimentos que movimentam cada município.
      </p>
      <p>
        Se sua empresa atua na Região dos Lagos, na Baixada Fluminense, no Norte Fluminense ou em qualquer
        outra área coberta pelo Circular, esse é um espaço para que ela seja apresentada ao público local
        de forma simples e direta.
      </p>
      <p>
        Se você busca uma campanha maior, com formato e segmentação personalizados, conheça também nossa
        página de{" "}
        <a href="/publicidade" style={linkStyle}>Publicidade</a>.
      </p>

      <h2 style={sectionStyle}>Alcance diferentes regiões</h2>
      <p>O Rio de Janeiro é formado por muito mais do que um único mercado.</p>
      <p>São regiões, municípios, comunidades e públicos com necessidades e interesses diferentes.</p>
      <p>
        A proposta regional do Circular Notícias RJ permite que sua empresa esteja presente em um ambiente
        voltado para a circulação de informações do Estado — e seja encontrada justamente pelo público de
        sua própria região.
      </p>
      <p>Da Região Metropolitana às demais regiões fluminenses, a informação circula.</p>
      <p>E sua marca pode circular junto.</p>

      <h2 style={sectionStyle}>Para quem é?</h2>
      <p>O espaço "Divulgue sua empresa" foi pensado principalmente para:</p>
      <ul style={{ paddingLeft: 20 }}>
        <li>comerciantes locais;</li>
        <li>pequenos e médios negócios;</li>
        <li>profissionais e prestadores de serviços;</li>
        <li>empreendedores;</li>
        <li>negócios de bairro ou de município;</li>
        <li>iniciativas e projetos locais.</li>
      </ul>
      <p>Não é necessário ter uma grande estrutura ou um grande orçamento.</p>
      <p>O que importa é ter algo relevante para apresentar ao público da sua região.</p>

      <h2 style={sectionStyle}>Publicidade sem poluição visual</h2>
      <p>Sabemos que ninguém gosta de navegar por uma página tomada por anúncios.</p>
      <p>
        Por isso, o Circular Notícias RJ busca manter uma experiência visual leve e organizada, mesmo para
        os negócios locais que fazem parte do "Divulgue sua empresa".
      </p>
      <p>
        Sua apresentação é pensada para ganhar visibilidade sem transformar a experiência de leitura em um
        ambiente excessivamente comercial.
      </p>

      <h2 style={sectionStyle}>Simples de começar</h2>
      <p>
        O funcionamento do "Divulgue sua empresa" é pensado para ser simples, especialmente para quem nunca
        anunciou em uma plataforma digital antes.
      </p>
      <p>
        Você não precisa ter experiência com marketing ou publicidade — basta ter uma história, um produto
        ou um serviço que valha a pena ser conhecido pela sua região.
      </p>
      <p>
        A equipe do Circular está à disposição para orientar sobre a melhor forma de apresentar sua empresa
        dentro do espaço disponível.
      </p>

      <h2 style={sectionStyle}>Seu negócio. Sua história. Seu público.</h2>
      <p>Você conhece sua empresa melhor do que ninguém.</p>
      <p>
        Por isso, a mensagem continua sendo sua — o Circular oferece o espaço e a estrutura para que ela
        chegue até quem mora e circula pela sua região.
      </p>
      <p>Você pode divulgar:</p>
      <p style={{ fontWeight: 600 }}>
        sua marca.
        <br />
        seu produto.
        <br />
        seu serviço.
        <br />
        sua promoção.
        <br />
        seu negócio.
        <br />
        sua iniciativa.
      </p>

      <h2 style={sectionStyle}>Por que esperar para ser encontrado?</h2>
      <p>
        Muitos negócios locais fazem um excelente trabalho, oferecem bons produtos e prestam bons serviços
        — mas ainda são conhecidos apenas dentro do seu círculo habitual de clientes.
      </p>
      <p>
        "Divulgue sua empresa" pode ajudar a mudar isso, aproximando seu negócio de leitores da sua própria
        região que ainda não o conhecem.
      </p>
      <p>Não prometemos resultados impossíveis.</p>
      <p>Oferecemos uma oportunidade real de apresentar sua empresa a novos leitores da sua região.</p>

      <h2 style={sectionStyle}>Faça sua empresa circular</h2>
      <p>Se você acredita que seu negócio tem algo a oferecer à sua região, existe um espaço para apresentar essa história.</p>
      <p>
        Entre em contato com o Circular Notícias RJ por meio de nossa página de{" "}
        <a href="/contato" style={linkStyle}>Contato</a> ou diretamente pelo e-mail:
      </p>
      <p>
        <a href="mailto:circularnoticias@gmail.com" style={linkStyle}>circularnoticias@gmail.com</a>
      </p>
      <p>Na mensagem, recomenda-se informar:</p>
      <ul style={{ paddingLeft: 20 }}>
        <li>nome da empresa ou negócio;</li>
        <li>município ou região de atuação;</li>
        <li>produto ou serviço a ser divulgado;</li>
        <li>informações de contato.</li>
      </ul>

      <h3 style={subSectionStyle}>Modelo de mensagem</h3>
      <p>Para facilitar, você pode copiar o modelo abaixo, preencher os campos e enviar por e-mail:</p>
      <pre style={templateStyle}>
{`Assunto: Divulgue sua Empresa — [Nome da empresa]

Nome da empresa ou negócio:
Município / região de atuação:
Produto ou serviço a ser divulgado:
Nome para contato:
Telefone / WhatsApp:
E-mail para contato:

Um pouco sobre sua empresa (opcional):
`}
      </pre>

      <p>Teremos prazer em conhecer sua empresa e avaliar as possibilidades de divulgação.</p>
      <p>Sua marca pode estar onde as pessoas da sua região já estão procurando informação.</p>
      <p style={{ fontWeight: 600 }}>Faça sua empresa circular.</p>

      <p style={{ marginTop: 32, fontSize: 13, color: "#64748b" }}>
        Circular Notícias RJ
        <br />
        Centro de Inteligência de Notícias do Estado do Rio de Janeiro
        <br />
        A informação circula. Você decide o que ler.
        <br />
        <br />
        Publicidade e divulgação: circularnoticias@gmail.com
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
      
