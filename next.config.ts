import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acessar o dev server pela URL de rede (ex: testes em outra
  // máquina na mesma LAN). Sem isso, o Next.js 15.3+ bloqueia por padrão
  // requisições cross-origin aos assets internos do dev server.
  allowedDevOrigins: ["192.168.15.16", "100.64.251.52"],
};

export default nextConfig;
