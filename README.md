# ShotFinder 🎬

ShotFinder é uma aplicação web que permite descobrir filmes e séries a partir de uma descrição textual de uma cena, frase marcante ou nome do título. O sistema utiliza inteligência artificial e integrações com as APIs TMDb (The Movie Database) e Watchmode para identificar o título e mostrar onde assistir online, além de exibir sinopse, elenco, imagem de capa e outras informações relevantes.

## 🚀 Funcionalidades
- Busca inteligente por texto (nome, frase ou descrição de cena)
- Sugestões automáticas de títulos enquanto digita (autocomplete)
- Exibição de sinopse, elenco principal, capa e ano
- Mostra onde assistir online (Netflix, Prime Video, Disney+, etc.) com links diretos
- Histórico de buscas (localStorage)
- Alternância entre tema claro e escuro (dark/light mode)
- Suporte a português e inglês (i18n)
- Interface moderna, responsiva e intuitiva

## 🛠️ Tecnologias Utilizadas
- **Front-end:** React.js (Create React App)
- **Back-end:** Node.js + Express
- **APIs:**
  - [TMDb](https://www.themoviedb.org/) (informações de filmes/séries)
  - [Watchmode](https://www.watchmode.com/) (plataformas de streaming)
- **Outros:**
  - CSS moderno e responsivo
  - localStorage para histórico e preferências

## 📦 Estrutura do Projeto
```
/ShotFinder
  /client   (Front-end React)
  /server   (Back-end Node.js + Express)
  README.md
```

## ⚙️ Como rodar o projeto localmente

### 1. Clone o repositório
```bash
 git clone https://github.com/seu-usuario/ShotFinder.git
 cd ShotFinder
```

### 2. Configuração do Back-end
- Acesse a pasta `server`:
  ```bash
  cd server
  npm install
  ```
- Crie uma conta e obtenha suas chaves de API na [TMDb](https://www.themoviedb.org/) e [Watchmode](https://www.watchmode.com/).
- No arquivo `index.js`, substitua as variáveis `TMDB_API_KEY` e `WATCHMODE_API_KEY` pelas suas chaves.
- Inicie o servidor:
  ```bash
  npm start
  ```

### 3. Configuração do Front-end
- Em outro terminal, acesse a pasta `client`:
  ```bash
  cd ../client
  npm install
  npm start
  ```
- O site estará disponível em `http://localhost:3000`

## 🌐 Deploy
- **Front-end:** Pode ser hospedado facilmente no [Vercel](https://vercel.com/) ou [Netlify](https://www.netlify.com/).
- **Back-end:** Hospede no [Render](https://render.com/), [Railway](https://railway.app/) ou outro serviço Node.js.
- Lembre-se de ajustar a URL do back-end no front-end para o endereço público do seu servidor.

## 📄 Licença
Este projeto é open source, sob a licença MIT.

---

Desenvolvido por Cauã Moreira.