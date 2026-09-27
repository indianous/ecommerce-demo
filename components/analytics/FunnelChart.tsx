"use client";

import { Funnel, Text } from "@indianous/base-ds";
import type { FunnelResponse } from "@/types";

const POST_LOGIN_ONLY_LABELS = ["Visualizou produto", "Adicionou ao carrinho"];

interface Stage {
  key: string;
  label: string;
  value: number;
}

function buildStages(data: FunnelResponse): Stage[] {
  return [
    { key: "visitors", label: "Visitantes", value: data.visitors },
    {
      key: "productViews",
      label: "Visualizou produto",
      value: data.productViews,
    },
    { key: "cartAdds", label: "Adicionou ao carrinho", value: data.cartAdds },
    {
      key: "checkoutsStarted",
      label: "Iniciou checkout",
      value: data.checkoutsStarted,
    },
    {
      key: "purchasesCompleted",
      label: "Comprou",
      value: data.purchasesCompleted,
    },
  ];
}

interface Props {
  data: FunnelResponse;
}

export function FunnelChart({ data }: Props) {
  const stages = buildStages(data);

  return (
    <div>
      <Funnel steps={stages.map(({ label, value }) => ({ label, value }))} />

      <Text size="sm" color="muted" className="mt-3">
        {POST_LOGIN_ONLY_LABELS.join(" e ")} refletem só clientes cadastrados,
        não visitante 100% anônimo.
      </Text>
    </div>
  );
}
