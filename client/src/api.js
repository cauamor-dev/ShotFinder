const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export async function request(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Object.assign(new Error("Resposta inválida do servidor."), {
      code: "PROVIDER",
    });
  }
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "Não foi possível concluir a consulta."),
      { code: data.code },
    );
  return data;
}
