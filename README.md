# Portfólio · Gustavo Laurindo

Meu portfólio pessoal: quem sou, minhas skills, projetos pessoais e para clientes, certificações e contato.

**🔗 No ar:** https://lawrindovsk.github.io/portfolio/

O site é estático (HTML, CSS e JavaScript puro, sem framework nem etapa de build) e é publicado pelo GitHub Pages direto da branch `master`.

## Destaques

- **Paisagem 3D com o Pyter**: no topo da página, um terreno de blocos feito com Three.js onde o Pyter, meu cachorro, passeia sozinho. Ele come, bebe água, brinca com a bola, o osso e o patinho, reage quando você toca nele e dorme à noite. Para acordá-lo, é preciso insistir.
- **Céu no horário de São Paulo**: dia, pôr do sol e noite com estrelas e postes acesos, de acordo com a hora real.
- **Polaroids do Pyter**: na seção "Sobre mim", clicar na minha foto abre um pop-up com fotos de verdade dele.
- **Certificações com pop-up** para ver cada certificado sem sair da página.
- **Responsivo e acessível**: funciona em celular, tablet e desktop, com navegação por teclado e respeito a `prefers-reduced-motion`.

## Tecnologias

| Parte | Uso |
| --- | --- |
| HTML + CSS | Estrutura e estilo, sem frameworks |
| JavaScript | Interações, lista de projetos, pop-ups e animações |
| [Three.js](https://threejs.org/) 0.160 | Cena 3D (cópia local em `static/vendor`, sem depender de CDN) |
| [Playwright](https://playwright.dev/) | Testes de ponta a ponta em 8 aparelhos |
| Node test runner + jsdom | Testes unitários da lista de projetos |
| GitHub Actions | Roda todos os testes em cada PR |

## Estrutura

```
index.html              página única com todas as seções
static/
  css/style.css         estilos
  js/main.js            menu, animações, projetos e pop-ups
  js/projects.js        lista de projetos (edite aqui para adicionar um)
  js/hero3d.js          paisagem 3D e o Pyter
  js/hero/              ícones em pixel art dos balões de reação
  img/                  certificados, logos e fotos do Pyter (WebP)
  vendor/               Three.js
src/
  img/                  foto de perfil e imagem de compartilhamento (og.png)
  docs/                 currículo em PDF
test/                   testes unitários
tests/                  testes de ponta a ponta (Playwright) e servidor local
```

## Rodando localmente

Requer [Node.js](https://nodejs.org/) 22 ou superior.

```bash
npm install
node tests/serve.mjs     # abre em http://localhost:4173
```

Qualquer servidor estático também funciona. Abrir o `index.html` direto no navegador não carrega a cena 3D, porque módulos ES precisam de HTTP.

Parâmetros úteis na URL:

- `?hora=20` força um horário para o céu (aceita decimais, como `6.5`)
- `?debug` expõe `window.pyter` com a posição e o estado do Pyter

## Testes

```bash
npm test               # unitários (lista de projetos)
npm run test:e2e       # Playwright: iPhone SE, iPhone 14, Pixel 7, Galaxy S9+,
                       # iPad Mini, iPad Pro, Galaxy Tab S4 e desktop
```

Os testes de ponta a ponta verificam, em cada aparelho: carregamento sem erros e sem rolagem horizontal, menu, ordem e numeração das seções, links, currículo, certificados e pop-ups, as polaroids e o comportamento do Pyter na cena 3D.

Localmente eles usam o Microsoft Edge; no CI, o Chromium do Playwright. Para testar o site já publicado:

```bash
BASE_URL=https://lawrindovsk.github.io/portfolio/ npm run test:e2e
```

## Adicionando um projeto

Copie um objeto em `static/js/projects.js` e preencha `title`, `description`, `type` (`pessoal`, `cliente` ou `academico`), `tags` e, se houver, `repo` e `demo`.

## Contato

- LinkedIn: [gustavolaurindosss](https://www.linkedin.com/in/gustavolaurindosss/)
- GitHub: [lawrindovsk](https://github.com/lawrindovsk)
