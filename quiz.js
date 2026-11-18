const perguntas = [
    {
        enunciado: "Qual é a importância do Dia da Consciência Negra?",
        alternativas: [
            "Celebrar a assinatura da Lei Áurea.",
            "Valorizar a história e a cultura do povo negro e combater o racismo.",
            "Marcar a independência do Brasil."
        ],
        correta: 1,
        explicacao: "A data valoriza as contribuições do povo negro e convida a sociedade a promover a igualdade racial."
    },
    {
        enunciado: "Quem foi Zumbi dos Palmares?",
        alternativas: [
            "Um líder negro que lutou contra a escravidão no Brasil colonial.",
            "Um escritor brasileiro do período republicano.",
            "Um governador nomeado pela Coroa portuguesa."
        ],
        correta: 0,
        explicacao: "Zumbi foi uma liderança negra na resistência à escravidão durante o período colonial."
    },
    {
        enunciado: "Que comunidade teve Zumbi como seu último grande líder?",
        alternativas: [
            "A vila de São Vicente.",
            "A cidade de Salvador.",
            "O Quilombo dos Palmares."
        ],
        correta: 2,
        explicacao: "O Quilombo dos Palmares acolhia pessoas que fugiam da escravidão."
    },
    {
        enunciado: "Em que data morreu Zumbi dos Palmares?",
        alternativas: [
            "13 de maio de 1888.",
            "20 de novembro de 1695.",
            "7 de setembro de 1822."
        ],
        correta: 1,
        explicacao: "Zumbi morreu em 20 de novembro de 1695 e se tornou símbolo da resistência negra e da luta pela liberdade."
    },
    {
        enunciado: "O que a Lei nº 12.519/2011 instituiu?",
        alternativas: [
            "O Dia Nacional de Zumbi e da Consciência Negra.",
            "A abolição da escravidão no Brasil.",
            "A criação do Quilombo dos Palmares."
        ],
        correta: 0,
        explicacao: "A lei homenageia Zumbi e reconhece a luta e a resistência do povo negro no Brasil."
    }
];

const TEMPO_POR_PERGUNTA = 10_000;
const PONTOS_POR_ACERTO = 10;
// Mantém a chave e os campos dos perfis das versões anteriores do quiz.
const chaveDosPerfis = "memoria.profiles";
const perfis = JSON.parse(localStorage.getItem(chaveDosPerfis) || "[]");
const elemento = (id) => document.getElementById(id);

let participante;
let indice = 0;
let pontos = 0;
let expiradas = 0;
let respondida = false;
let prazo;
let intervalo;

function salvarPerfis() {
    localStorage.setItem(chaveDosPerfis, JSON.stringify(perfis));
}

function mostrarTela(tela) {
    for (const id of ["entrada", "pergunta", "resultado"]) {
        elemento(id).hidden = id !== tela;
    }
}

function mudarExpressao(fala, expressao) {
    elemento("speech").textContent = fala;
    document.body.classList.toggle("acerto", expressao === "acerto");
    document.body.classList.toggle("decepcao", expressao === "decepcao");
}

function atualizarPlacar() {
    elemento("score").textContent = pontos;
    document.querySelectorAll(".stars i").forEach((estrela, i) => {
        estrela.classList.toggle("earned", pontos >= (i + 1) * PONTOS_POR_ACERTO);
    });
    elemento("profile").hidden = !participante;
    elemento("record").textContent = participante
        ? participante.name + " · Recorde pessoal: " + participante.best + " pontos."
        : "A rodada começa depois que você informar seu nome.";
}

function atualizarRanking() {
    const ranking = perfis
        .filter(perfil => perfil.completed || perfil.best > 0)
        .sort((a, b) => b.best - a.best || a.name.localeCompare(b.name, "pt-BR"));

    const corpo = elemento("classificacao");
    corpo.replaceChildren();
    corpo.closest("table").hidden = ranking.length === 0;
    elemento("ranking-vazio").hidden = ranking.length > 0;

    let posicao = 0;
    ranking.forEach((perfil, i) => {
        // Dois recordes iguais dividem a mesma colocação.
        if (i === 0 || perfil.best !== ranking[i - 1].best) posicao = i + 1;
        const linha = corpo.insertRow();
        linha.classList.toggle("current", perfil === participante);
        const medalha = document.createElement("span");
        medalha.className = "place place-" + posicao;
        medalha.textContent = posicao + "º";
        linha.insertCell().append(medalha);
        linha.insertCell().textContent = perfil.name;
        linha.insertCell().textContent = perfil.best;
    });
}

function iniciarRodada(evento) {
    evento.preventDefault();
    const campo = elemento("nick");
    const nome = campo.value.normalize("NFC").trim().replace(/\s+/g, " ");
    if (!nome) {
        campo.setCustomValidity("Digite seu nome para começar.");
        campo.reportValidity();
        return;
    }
    participante = perfis.find(perfil =>
        perfil.name.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR")
    );
    if (!participante) {
        participante = { name: nome, best: 0, completed: false };
        perfis.push(participante);
        salvarPerfis();
    }
    atualizarPlacar();
    atualizarRanking();
    mostrarPergunta();
    elemento("quiz").scrollIntoView({ block: "nearest" });
}

function mostrarPergunta(anteriorExpirou = false) {
    mostrarTela("pergunta");
    respondida = false;
    const pergunta = perguntas[indice];
    const numero = indice + 1;
    elemento("numero").textContent = "Pergunta " + String(numero).padStart(2, "0");
    elemento("progresso").style.width = (numero / perguntas.length) * 100 + "%";
    elemento("enunciado").textContent = pergunta.enunciado;
    elemento("feedback").hidden = true;
    elemento("aviso").hidden = !anteriorExpirou;
    if (anteriorExpirou) {
        elemento("aviso").textContent = "Tempo esgotado na pergunta " + indice + " · 0 pontos";
        mudarExpressao("Poxa, acabou o tempo!", "decepcao");
    } else {
        mudarExpressao("Pergunta " + numero + " de " + perguntas.length + "!");
    }

    const alternativas = elemento("alternativas");
    alternativas.replaceChildren();
    pergunta.alternativas.forEach((texto, i) => {
        const botao = document.createElement("button");
        const letra = document.createElement("span");
        letra.textContent = "ABC"[i];
        botao.className = "opt";
        botao.append(letra, texto);
        botao.onclick = () => responder(i);
        alternativas.append(botao);
    });
    prazo = performance.now() + TEMPO_POR_PERGUNTA;
    elemento("clock").setAttribute("aria-label", "Tempo restante");
    atualizarRelogio();
    intervalo = setInterval(atualizarRelogio, 100);
}

function atualizarRelogio() {
    const restante = Math.max(0, prazo - performance.now());
    elemento("seconds").textContent = Math.ceil(restante / 1000) + " s";
    elemento("clock").classList.toggle("urgent", restante <= 3000);
    if (restante === 0) expirarPergunta();
}

function registrarUltimaPergunta() {
    if (indice !== perguntas.length - 1) return;
    participante.best = Math.max(participante.best, pontos);
    participante.completed = true;
    salvarPerfis();
    atualizarRanking();
    atualizarPlacar();
}

function expirarPergunta() {
    if (respondida) return;
    respondida = true;
    clearInterval(intervalo);
    expiradas++;
    registrarUltimaPergunta();
    avancar(true);
}

function responder(escolha) {
    if (respondida) return;
    // O clique também verifica o prazo entre duas atualizações do relógio.
    if (performance.now() >= prazo) {
        expirarPergunta();
        return;
    }
    respondida = true;
    clearInterval(intervalo);
    elemento("clock").setAttribute("aria-label", "Tempo restante ao responder");
    const pergunta = perguntas[indice];
    const acertou = escolha === pergunta.correta;
    if (acertou) {
        pontos += PONTOS_POR_ACERTO;
        mudarExpressao("Boa! +10 pontos!", "acerto");
    } else {
        mudarExpressao("Vamos aprender!", "decepcao");
    }
    elemento("alternativas").querySelectorAll("button").forEach((botao, i) => {
        botao.disabled = true;
        botao.classList.toggle("good", i === pergunta.correta);
        botao.classList.toggle("bad", i === escolha && !acertou);
    });
    elemento("correcao").textContent = acertou
        ? "Você acertou!" : "Resposta correta: " + "ABC"[pergunta.correta] + ".";
    elemento("explicacao").textContent = pergunta.explicacao;
    elemento("avancar").textContent = indice === perguntas.length - 1
        ? "Ver resultado →" : "Próxima pergunta →";
    elemento("feedback").hidden = false;
    registrarUltimaPergunta();
    atualizarPlacar();
}

function avancar(anteriorExpirou = false) {
    indice++;
    if (indice < perguntas.length) {
        mostrarPergunta(anteriorExpirou);
        return;
    }
    mostrarTela("resultado");
    const acertos = pontos / PONTOS_POR_ACERTO;
    elemento("resumo").textContent = "Você acertou " + acertos + " de " + perguntas.length + " perguntas e fez " + pontos + " pontos.";
    elemento("expiradas").textContent = "Tempo esgotado em " + expiradas + " de " + perguntas.length + " perguntas.";
    if (anteriorExpirou) mudarExpressao("Poxa, acabou o tempo!", "decepcao");
    else mudarExpressao(acertos === perguntas.length ? "Cinco de cinco!" : "Rodada completa!");
}

function voltarParaEntrada() {
    clearInterval(intervalo);
    participante = null;
    indice = 0;
    pontos = 0;
    expiradas = 0;
    respondida = false;
    mostrarTela("entrada");
    mudarExpressao("Bora jogar?");
    atualizarPlacar();
    atualizarRanking();
    elemento("identity").reset();
    elemento("nick").setCustomValidity("");
    elemento("nick").focus();
}

elemento("identity").onsubmit = iniciarRodada;
elemento("nick").oninput = () => elemento("nick").setCustomValidity("");
elemento("avancar").onclick = () => avancar();
elemento("reiniciar").onclick = voltarParaEntrada;
elemento("profile").onclick = () => {
    const emAndamento = indice < perguntas.length && (indice > 0 || respondida);
    if (emAndamento && !window.confirm("Encerrar esta rodada e trocar de participante?")) return;
    voltarParaEntrada();
};

atualizarPlacar();
atualizarRanking();
