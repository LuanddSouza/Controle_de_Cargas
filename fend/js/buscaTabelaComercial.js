let listaOriginal = [];

// 🚀 CARREGAR TABELA
async function carregarTabela() {
    try {
        const token = localStorage.getItem("token");

        const estab = document.getElementById("select_estab").value;
        const data = document.querySelector("input[type='date']").value;

        if (!estab || !data) {
            console.warn("Filtros não preenchidos");
            return;
        }

        const response = await fetch(`/cargasComercial?estab=${estab}&data=${data}`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!response.ok) {
            throw new Error("Erro ao buscar cargas");
        }

        const dados = await response.json();
        listaOriginal = dados;

        console.log("📦 Dados recebidos:", dados);

        montarTabela(dados);

    } catch (err) {
        console.error("❌ Erro ao carregar tabela:", err);
    }
}

// 🔍 FILTRO
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

// 🧩 MONTAR TABELA (SOMENTE VISUAL)
function montarTabela(lista) {
    const tbody = document.getElementById("tbody_cargas");
    tbody.innerHTML = "";

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

        const status = item[6] ?? "";

        const cores = {
            'PENDENTE': 'bg-gray-400',
            'EM PRODUÇÃO': 'bg-blue-500',
            'QUALIDADE': 'bg-yellow-500',
            'CARREGAMENTO': 'bg-orange-500',
            'FATURADO': 'bg-green-600',
            'CANCELADO': 'bg-red-500'
        };

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

            <td class="p-4">
                <span class="text-white px-3 py-1 rounded-full text-xs font-semibold ${corClasse}">
                    ${status || 'PENDENTE'}
                </span>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// 🎯 BOTÃO FILTRAR
document.getElementById("btn_filtrar")
    .addEventListener("click", carregarTabela);

// 🔄 INIT
function init() {
    document.getElementById("filtro_agendamento")
        .addEventListener("input", filtrarTabela);

    document.getElementById("filtro_coordenador")
        .addEventListener("input", filtrarTabela);
}

document.addEventListener("DOMContentLoaded", init);