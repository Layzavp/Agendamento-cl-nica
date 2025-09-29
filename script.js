const form = document.getElementById("form-agendamento");
const listaAgendamentos = document.getElementById("lista-agendamentos");
const pesquisaInput = document.getElementById("pesquisa");
const selectMedico = document.getElementById("select-medico");
const resultadoMedico = document.getElementById("resultado-medico");
const observacaoConflito = document.getElementById("observacao-conflito");
const botaoForcar = document.getElementById("forcar-agendamento");

let agendamentoPendiente = null;

// Carregar agendamentos do LocalStorage
let agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

// Converter hora "HH:MM" para minutos
function horaParaMinutos(horaStr) {
  const [h, m] = horaStr.split(":").map(Number);
  return h * 60 + m;
}

// Converter minutos para hora "HH:MM"
function minutosParaHora(minutos) {
  const h = Math.floor(minutos / 60).toString().padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Verificar se o horário está livre (±20 min)
function horarioLivre(medico, data, horaDesejada) {
  const minutosDesejados = horaParaMinutos(horaDesejada);
  return !agendamentos.some(a => 
    a.medico === medico &&
    a.data === data &&
    Math.abs(horaParaMinutos(a.hora) - minutosDesejados) < 20
  );
}

// Calcular horários sugeridos mais próximos (antes e depois)
function horariosSugeridos(medico, data, horaDesejada) {
  const minutosDesejados = horaParaMinutos(horaDesejada);
  const ocupados = agendamentos
    .filter(a => a.medico === medico && a.data === data)
    .map(a => horaParaMinutos(a.hora))
    .sort((a, b) => a - b);

  // Inicializa antes/depois
  let antes = minutosDesejados - 20;
  while (ocupados.includes(antes) && antes > 0) antes -= 1;

  let depois = minutosDesejados + 20;
  while (ocupados.includes(depois)) depois += 1;

  return { antes: minutosParaHora(Math.max(0, antes)), depois: minutosParaHora(depois) };
}

// Exibir agendamentos
function mostrarAgendamentos(filtro = "") {
  listaAgendamentos.innerHTML = "";

  const filtrados = agendamentos.filter(a =>
    a.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  if (filtrados.length === 0 && filtro !== "") {
    listaAgendamentos.innerHTML = `<li>Nenhum paciente encontrado para "${filtro}"</li>`;
    return;
  }

  filtrados.forEach((agendamento, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${agendamento.nome}</strong> - ${agendamento.data} às ${agendamento.hora} | Médico: ${agendamento.medico}</span>
      <button onclick="removerAgendamento(${index})">Cancelar</button>
    `;
    listaAgendamentos.appendChild(li);
  });

  atualizarListaMedicos();
}

// Atualizar select de médicos
function atualizarListaMedicos() {
  const medicos = [...new Set(agendamentos.map(a => a.medico))];
  selectMedico.innerHTML = `<option value="">Selecione um médico</option>`;
  medicos.forEach(medico => {
    const option = document.createElement("option");
    option.value = medico;
    option.textContent = medico;
    selectMedico.appendChild(option);
  });
}

// Função para salvar agendamento no LocalStorage
function salvarAgendamento(agendamento) {
  agendamentos.push(agendamento);
  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
  mostrarAgendamentos(pesquisaInput.value);
}

// Adicionar agendamento
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = document.getElementById("nome").value.trim();
  const data = document.getElementById("data").value;
  let hora = document.getElementById("hora").value;
  const medico = document.getElementById("medico").value.trim();

  if (!nome || !data || !hora || !medico) return;

  if (!horarioLivre(medico, data, hora)) {
    // Sugerir horários antes e depois
    const { antes, depois } = horariosSugeridos(medico, data, hora);
    observacaoConflito.innerHTML = `Horário indisponível! Horários sugeridos: <strong>${antes}</strong> ou <strong>${depois}</strong>`;
    botaoForcar.style.display = "inline-block";

    // Armazena o agendamento pendente
    agendamentoPendiente = { nome, data, hora, medico };
    return;
  }

  // Adicionar normalmente
  salvarAgendamento({ nome, data, hora, medico });
  form.reset();
  observacaoConflito.innerHTML = "";
  botaoForcar.style.display = "none";
  agendamentoPendiente = null;
});

// Botão "Agendar mesmo assim"
botaoForcar.addEventListener("click", () => {
  if (agendamentoPendiente) {
    salvarAgendamento(agendamentoPendiente);
    form.reset();
    observacaoConflito.innerHTML = "";
    botaoForcar.style.display = "none";
    agendamentoPendiente = null;
  }
});

// Remover agendamento
function removerAgendamento(index) {
  agendamentos.splice(index, 1);
  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
  mostrarAgendamentos(pesquisaInput.value);
}

// Pesquisar por paciente
pesquisaInput.addEventListener("input", (e) => {
  mostrarAgendamentos(e.target.value);
});

// Consultar por médico
selectMedico.addEventListener("change", (e) => {
  const medicoSelecionado = e.target.value;
  if (!medicoSelecionado) {
    resultadoMedico.innerHTML = "";
    return;
  }

  const agendamentosMedico = agendamentos.filter(a => a.medico === medicoSelecionado);

  if (agendamentosMedico.length > 0) {
    let horarios = agendamentosMedico.map(a => `${a.data} às ${a.hora} (${a.nome})`).join("<br>");
    resultadoMedico.innerHTML = `
      <strong>Médico:</strong> ${medicoSelecionado}<br>
      <strong>Total de pacientes:</strong> ${agendamentosMedico.length}<br>
      <strong>Horários:</strong><br>${horarios}
    `;
  } else {
    resultadoMedico.innerHTML = `Nenhum paciente encontrado para ${medicoSelecionado}`;
  }
});

// Inicializar
mostrarAgendamentos();
