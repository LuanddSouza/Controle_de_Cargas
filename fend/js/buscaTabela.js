

let listaOriginal = [];

//  CARREGAR TABELA
async function carregarTabela() {
    try {
        const token = localStorage.getItem("token");

        const estab = document.getElementById("select_estab").value;
        const data = document.querySelector("input[type='date']").value;

        if (!estab || !data) {
            console.warn("Filtros não preenchidos");
            return;
        }

        const response = await fetch(`/cargas?estab=${estab}&data=${data}`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!response.ok) {
            throw new Error("Erro ao buscar cargas");
        }

        const dados = await response.json();
        listaOriginal = dados; //armazenar

        console.log("📦 Dados recebidos:", dados);

        montarTabela(dados);

    } catch (err) {
        console.error("❌ Erro ao carregar tabela:", err);
    }
}

function filtrarTabela() {
    const agendamento = document.getElementById("filtro_agendamento").value.toLowerCase();
    const coordenador = document.getElementById("filtro_coordenador").value.toLowerCase();

    const filtrados = listaOriginal.filter(item => {
        const campoAgendamento = String(item[0] ?? "").toLowerCase();
        const campoCoordenador = String(item[1] ?? "").toLowerCase();

        return (
            campoAgendamento.includes(agendamento) &&
            campoCoordenador.includes(coordenador)
        );
    });

    montarTabela(filtrados);
}

function handleStatusChange(select, agendamento, estab) {
    const status = select.value;

    const cores = {
        pendente: "bg-gray-500",
        producao: "bg-blue-500",
        qualidade: "bg-yellow-500",
        carregando: "bg-purple-500",
        faturado: "bg-green-600",
        cancelado: "bg-red-500"
    };

    // limpa TODAS classes possíveis
    select.className = "status-select text-white rounded px-2 py-1";

    // aplica nova cor
    select.classList.add(cores[status]);

    atualizarStatus(agendamento, estab, status);
}

function removerCor(select) {
    select.classList.remove(
        "bg-gray-500",
        "bg-blue-500",
        "bg-yellow-500",
        "bg-purple-500",
        "bg-green-600",
        "bg-red-500",
        "bg-orange-500"
    );

    // cor padrão quando abre
    select.classList.add("bg-gray-200", "text-black");
}

function restaurarCor(select) {
    const status = select.value;

    const cores = {
        pendente: "bg-gray-500",
        producao: "bg-blue-500",
        qualidade: "bg-yellow-500",
        carregando: "bg-purple-500",
        faturado: "bg-green-600",
        cancelado: "bg-red-500"
    };

    select.classList.remove("bg-gray-200", "text-black");
    select.classList.add("text-white");

    select.classList.add(cores[status]);
}

// MONTAR TABELA
function montarTabela(lista) {
    const tbody = document.getElementById("tbody_cargas");
    const estab = document.getElementById("select_estab").value;
    tbody.innerHTML = "";

    // SE NÃO TEM DADOS
    if (!lista || lista.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td colspan="11" class="p-4 text-center text-black-500">
                Nenhum dado encontrado para os filtros selecionados
            </td>
        `;

        tbody.appendChild(tr);
        return;
    }

    lista.forEach(item => {

        // evita quebrar se vier undefined/null
       // const id = item[9] ?? "";
        const status = item[9] ?? "";
        const cores = {
            'PENDENTE': 'bg-gray-400',
            'EM PRODUÇÃO': 'bg-blue-500',
            'QUALIDADE': 'bg-yellow-500',
            'CARREGAMENTO': 'bg-orange-500',
            'FATURADO': 'bg-green-600',
            'CANCELADO': 'bg-red-500'
        };
        console.log(status);
        const corClasse = cores[status] || "bg-gray-400";

        let tr = document.createElement("tr");
        tr.classList.add("border-b", "hover:bg-gray-50");

        tr.innerHTML = `
            <td class="p-4">${item[0] ?? ''}</td>
            <td class="p-4">${item[1] ?? ''}</td>

            <td class="p-4">${item[2] ?? ''}</td>

            <td class="p-4">${item[3] ?? ''}</td>

            <td class="p-4">${item[4] ?? ''}</td>

            <td class="p-4">${item[5] ?? ''}</td>
            <td class="p-4">${item[6] ?? ''}</td>
            <td class="p-4">${item[7] ?? ''}</td>

            <td class="p-4">${item[8] ?? ''}</td>

           <td class="p-4">
                <select 
                    class="status-select text-white rounded px-2 py-1 ${corClasse}"
                    onchange="handleStatusChange(this, '${item[0]}', '${estab}')"
                >
                    <option value="pendente" ${status === 'PENDENTE' ? 'selected' : ''}>PENDENTE</option>
                    <option value="producao" ${status === 'EM PRODUÇÃO' ? 'selected' : ''}>EM PRODUÇÃO</option>
                    <option value="qualidade" ${status === 'QUALIDADE' ? 'selected' : ''}>QUALIDADE</option>
                    <option value="carregando" ${status === 'CARREGAMENTO' ? 'selected' : ''}>CARREGAMENTO</option>
                    <option value="faturado" ${status === 'FATURADO' ? 'selected' : ''}>FATURADO</option>
                    <option value="cancelado" ${status === 'CANCELADO' ? 'selected' : ''}>CANCELADO</option>
                </select>
            </td> 
        `;

        tbody.appendChild(tr);
    });
}


//  FILTRO MANUAL

document.getElementById("btn_filtrar")
    .addEventListener("click", carregarTabela);


// ATUALIZAR STATUS
async function atualizarStatus( agendamento, estab, status) {
    try {
        const token = localStorage.getItem("token");
        const usuario = localStorage.getItem("usuario");
        const usuarioCod = localStorage.getItem("userCod");
        const statusCod = localStorage.getItem("statusCod");
        const estabCod = document.getElementById("select_estab").value;

        // Atualiza status normal
        await fetch(`/cargas/${agendamento}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                status,
                estab
            })
        });

        console.log(`Status atualizado + log enviado`);

    } catch (err) {
        console.error("❌ Erro ao atualizar status:", err);
    }
}


function init() {
    document.getElementById("filtro_agendamento")
        .addEventListener("input", filtrarTabela);

    document.getElementById("filtro_coordenador")
        .addEventListener("input", filtrarTabela);
}

document.addEventListener("DOMContentLoaded", init);