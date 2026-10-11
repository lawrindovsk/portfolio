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
		title: "Portal para Formandos de Enfermagem",
		description:
			"Site para um grupo de formandos em enfermagem oferecerem atendimento rápido, simples e objetivo ao público idoso.",
		type: "academico",
		tags: ["HTML", "CSS", "JavaScript"],
		image: "",
		repo: "https://github.com/Leon16x8/saudedoidoso",
		demo: "",
		featured: true,
	},
	{
		title: "Portfólio Pessoal",
		description:
			"Este site: landing page responsiva com animações, grid de projetos filtrável e zero dependências.",
		type: "pessoal",
		tags: ["HTML", "CSS", "JavaScript"],
		image: "",
		repo: "https://github.com/lawrindovsk/portfolio",
		demo: "",
		featured: false,
	},
	{
		title: "Próximo projeto",
		description: "Em construção. Acompanhe pelo GitHub para ver o que vem por aí.",
		type: "pessoal",
		tags: ["C#", ".NET"],
		image: "",
		repo: "https://github.com/lawrindovsk",
		demo: "",
		featured: false,
	},
];
