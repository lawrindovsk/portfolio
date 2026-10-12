/*
 * Lista de projetos exibidos no grid.
 * Para adicionar um projeto, copie um objeto e preencha os campos:
 *
 *   title       Nome do projeto
 *   description Uma ou duas frases: o problema e o que você entregou
 *   type        "pessoal", "cliente" ou "academico" (academico só exibe a tag, sem filtro)
 *   tags        Tecnologias usadas
 *   image       Caminho da imagem (ex.: "src/img/projetos/meu-projeto.png"). Opcional:
 *               sem imagem, o card mostra um placeholder com as iniciais.
 *   repo        Link do GitHub (opcional)
 *   demo        Link do site no ar (opcional)
 *   featured    true ocupa duas colunas no grid (use para os melhores)
 */
const PROJECTS = [
	{
		title: "API REST para sistema de delivery",
		description: "API de pedidos e controle financeiro para pequenos negócios, com autenticação JWT, validação, cache, documentação Swagger e execução via Docker.",
		type: "academico",
		tags: [
			"Java 21",
			"Spring Boot",
			"Spring Security",
			"JWT",
			"JPA",
			"Docker",
			"Swagger"
		],
		image: "",
		repo: "https://github.com/lawrindovsk/java_springbootApiRestFull_Delivery",
		demo: "",
		featured: true,
	},
	{
		title: "Assistente GLPI com IA (Gemini)",
		description: "Console em C# que integra a API REST do GLPI ao Gemini para consultar e resumir chamados em linguagem natural, testando o conceito de MCP.",
		type: "pessoal",
		tags: [
			"C#",
			".NET",
			"Gemini API",
			"GLPI API",
			"REST"
		],
		image: "",
		repo: "https://github.com/lawrindovsk/testingMCP_gemini_Glpi",
		demo: "",
		featured: true,
	},
	{
		title: "Portal para Formandos de Enfermagem",
		description: "Site para um grupo de formandos em enfermagem oferecerem atendimento rápido, simples e objetivo ao público idoso.",
		type: "academico",
		tags: [
			"HTML",
			"CSS",
			"JavaScript"
		],
		image: "",
		repo: "https://github.com/Leon16x8/saudedoidoso",
		demo: "",
		featured: false,
	},
	{
		title: "Batedor de ponto assistivo",
		description: "Protótipo em Arduino Uno com sensor ultrassônico HC-SR04, LCD 16x2 I2C e buzzer para registrar ponto por aproximação, pensado para pessoas com deficiência motora.",
		type: "academico",
		tags: [
			"Arduino",
			"C++",
			"I2C",
			"Wokwi"
		],
		image: "",
		repo: "https://github.com/lawrindovsk/marcacaoPonto_arduino",
		demo: "https://wokwi.com/projects/448820197261540353",
		featured: false,
	},
	{
		title: "Landing page para psicóloga",
		description: "Site institucional para divulgação profissional e captação de pacientes de uma cliente.",
		type: "cliente",
		tags: [
			"HTML",
			"CSS",
			"JavaScript"
		],
		image: "",
		repo: "",
		demo: "",
		featured: false,
	},
	{
		title: "Portfólio Pessoal",
		description: "Este site: landing page responsiva com cena 3D interativa, animações e zero dependências de framework.",
		type: "pessoal",
		tags: [
			"HTML",
			"CSS",
			"JavaScript",
			"Three.js"
		],
		image: "",
		repo: "https://github.com/lawrindovsk/portfolio",
		demo: "",
		featured: false,
	},
	{
		title: "HTML Editor para console",
		description: "Aplicação de console em C# que interpreta tags HTML com Regex e destaca o conteúdo formatado no terminal.",
		type: "pessoal",
		tags: [
			"C#",
			".NET",
			"Regex"
		],
		image: "",
		repo: "https://github.com/lawrindovsk/HTMLEditor",
		demo: "",
		featured: false,
	},
];
