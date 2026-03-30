
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

        console.log("📦 Dados recebidos:", dados);

        montarTabela(dados);

    } catch (err) {
        console.error("❌ Erro ao carregar tabela:", err);
    }
}

// MONTAR TABELA
function montarTabela(lista) {
    const tbody = document.getElementById("tbody_cargas");
    const estab = document.getElementById("select_estab").value;
    tbody.innerHTML = "";

    lista.forEach(item => {

        // evita quebrar se vier undefined/null
        const id = item[9] ?? "";
        const status = item[10] ?? "";

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
                <select onchange="atualizarStatus(${id}, '${item[0]}', '${estab}', this.value)">
                    <option value="pendente" ${status === 'PENDENTE' ? 'selected' : ''}>PENDENTE</option>
                    <option value="producao" ${status === 'EM PRODUÇÃO' ? 'selected' : ''}>EM PRODUÇÃO</option>
                    <option value="qualidade" ${status === 'QUALIDADE' ? 'selected' : ''}>QUALIDADE</option>
                    <option value="carregando" ${status === 'CARREGANDO' ? 'selected' : ''}>CARREGANDO</option>
                    <option value="faturado" ${status === 'FATURADO' ? 'selected' : ''}>FATURADO</option>
                    <option value="cancelado" ${status === 'CANCELADO' ? 'selected' : ''}>CANCELADO</option>
                </select>
            </td>

            <td class="p-4">
                <input type="text" value="${item[11] ?? ''}"
                    class="border rounded px-2 py-1 w-full"
                    onchange="atualizarCampo(${id}, 'campo11', this.value)">
            </td>
        `;

        tbody.appendChild(tr);
    });
}


//  FILTRO MANUAL

document.getElementById("btn_filtrar")
    .addEventListener("click", carregarTabela);


// ATUALIZAR STATUS
async function atualizarStatus(id, agendamento, estab, status) {
    try {
        const token = localStorage.getItem("token");
        const usuario = localStorage.getItem("usuario");
        const usuarioCod = localStorage.getItem("userCod");
        const statusCod = localStorage.getItem("statusCod");
        const estabCod = document.getElementById("select_estab").value;
        console.log(`Estabi ${estab}`)
        console.log(`Estabi ${estabCod}`)

        // Atualiza status normal
        await fetch(`/cargas/${id}/status`, {
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


// ATUALIZAR CAMPOS EDITÁVEIS
async function atualizarCampo(id, campo, valor) {
    try {
        const token = localStorage.getItem("token");

        await fetch(`/cargas/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                campo,
                valor
            })
        });

        console.log(`✏️ Campo atualizado: ${campo} → ${valor}`);

    } catch (err) {
        console.error("❌ Erro ao atualizar campo:", err);
    }
}