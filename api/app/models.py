from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class UF(str, Enum):
    AC = "AC"
    AL = "AL"
    AP = "AP"
    AM = "AM"
    BA = "BA"
    CE = "CE"
    DF = "DF"
    ES = "ES"
    GO = "GO"
    MA = "MA"
    MT = "MT"
    MS = "MS"
    MG = "MG"
    PA = "PA"
    PB = "PB"
    PR = "PR"
    PE = "PE"
    PI = "PI"
    RJ = "RJ"
    RN = "RN"
    RS = "RS"
    RO = "RO"
    RR = "RR"
    SC = "SC"
    SP = "SP"
    SE = "SE"
    TO = "TO"


class CategoriaFiltro(str, Enum):
    TODAS = "todas"
    REPAROS_ESCOLAS = "pequenos-reparos-escolas"
    REPAROS_GERAIS = "pequenos-reparos"

    @property
    def pdde(self) -> str | None:
        return {
            self.TODAS: None,
            self.REPAROS_ESCOLAS: "true",
            self.REPAROS_GERAIS: "false",
        }[self]


class StatusOportunidade(str, Enum):
    ABERTAS = "abertas"
    EM_ANDAMENTO = "andamento"
    CONCLUIDAS = "concluidas"


class Endereco(BaseModel):
    logradouro: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    estado: str | None = None
    ponto_referencia: str | None = None


class Anexo(BaseModel):
    nome: str
    url: HttpUrl
    url_expira_em: datetime | None = Field(
        default=None,
        description="Expiração estimada quando o portal fornece uma URL assinada.",
    )


class Duvida(BaseModel):
    pergunta: str
    resposta: str | None = None


class DetalhesOportunidade(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    categoria: str | None = None
    atividade: str
    especificacao: str | None = None
    orgao_demandante: str
    local_execucao: str | None = None
    endereco: Endereco
    descricao: str
    forma_pagamento: str | None = None
    prazo_pagamento: str | None = None
    apenas_mei: bool | None = None
    data_limite_execucao: str | None = Field(
        default=None,
        description="Texto de data exatamente como publicado pelo portal.",
    )
    anexos: list[Anexo] = Field(default_factory=list)
    duvidas: list[Duvida] = Field(default_factory=list)
    url_origem: HttpUrl


class Oportunidade(BaseModel):
    id: int
    atividade: str
    orgao_demandante: str
    bairro: str | None = None
    municipio: str | None = None
    descricao_resumida: str
    status_portal: str | None = None
    status_texto: str | None = None
    data_expiracao: datetime | None = None
    url_origem: HttpUrl
    detalhes: DetalhesOportunidade | None = None
    erro_detalhes: str | None = Field(
        default=None,
        description="Erro individual, quando os demais resultados puderam ser preservados.",
    )


class FiltrosAplicados(BaseModel):
    query: str | None = None
    uf: UF | None = None
    municipios: list[str] = Field(default_factory=list)
    categoria: CategoriaFiltro
    status_oportunidade: StatusOportunidade


class ListaOportunidades(BaseModel):
    pagina: int
    por_pagina: int
    total: int
    total_paginas: int
    filtros_aplicados: FiltrosAplicados
    itens: list[Oportunidade]


class OpcaoFiltro(BaseModel):
    valor: str
    rotulo: str


class MunicipioOpcao(BaseModel):
    id: int
    nome: str


class FiltrosDisponiveis(BaseModel):
    estados: list[OpcaoFiltro]
    categorias: list[OpcaoFiltro]
    status: list[OpcaoFiltro]
    municipios: list[MunicipioOpcao] = Field(
        default_factory=list,
        description="Preenchido somente quando o parâmetro uf é informado.",
    )


class HealthResponse(BaseModel):
    status: str


class ErrorResponse(BaseModel):
    detail: str

