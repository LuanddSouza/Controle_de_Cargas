
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

            <td class="p-4">
                <input type="text" value="${item[2] ?? ''}"
                    class="border rounded px-2 py-1 w-full"
                    onchange="atualizarCampo(${id}, 'campo2', this.value)">
            </td>

            <td class="p-4">${item[3] ?? ''}</td>

            <td class="p-4">
                <input type="text" value="${item[4] ?? ''}"
                    class="border rounded px-2 py-1 w-full"
                    onchange="atualizarCampo(${id}, 'campo4', this.value)">
            </td>

            <td class="p-4">${item[5] ?? ''}</td>
            <td class="p-4">${item[6] ?? ''}</td>
            <td class="p-4">${item[7] ?? ''}</td>

            <td class="p-4">
                <input type="text" value="${item[8] ?? ''}"
                    class="border rounded px-2 py-1 w-full"
                    onchange="atualizarCampo(${id}, 'campo8', this.value)">
            </td>

            <td class="p-4">
                <select onchange="atualizarStatus(${id}, this.value)">
                    <option value="producao" ${status === 'producao' ? 'selected' : ''}>EM PRODUÇÃO</option>
                    <option value="carregando" ${status === 'carregando' ? 'selected' : ''}>CARREGANDO</option>
                    <option value="faturado" ${status === 'faturado' ? 'selected' : ''}>FATURADO</option>
                    <option value="cancelado" ${status === 'cancelado' ? 'selected' : ''}>CANCELADO</option>
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

async function atualizarStatus(id, status) {
    try {
        const token = localStorage.getItem("token");

        await fetch(`/cargas/${id}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ status })
        });

        console.log(`✅ Status atualizado: ${id} → ${status}`);

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