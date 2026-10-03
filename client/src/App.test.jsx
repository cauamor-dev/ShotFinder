import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { request } from "./api.js";
vi.mock("./api.js", () => ({ request: vi.fn() }));
const movie = {
  id: 42,
  media_type: "movie",
  title: "Interestelar",
  original_title: "Interstellar",
  year: "2014",
  overview: "Uma viagem entre as estrelas.",
  poster: "",
  rating: 8.5,
  votes: 200,
};
const tv = { ...movie, media_type: "tv", title: "Uma série", year: "2020" };
const details = {
  ...movie,
  runtime: 169,
  genres: ["Ficção científica"],
  cast: [{ name: "Matthew", character: "Cooper" }],
  streaming: [{ name: "Netflix", type: "sub", url: "https://netflix.com" }],
  streaming_status: "ok",
  tmdb_url: "https://www.themoviedb.org/movie/42",
};
beforeEach(() => {
  request.mockReset();
  request.mockImplementation((path) =>
    Promise.resolve(
      path.startsWith("/suggestions")
        ? []
        : path.startsWith("/titles")
          ? details
          : [movie, tv],
    ),
  );
});
async function search(user) {
  await user.type(
    screen.getByRole("combobox", { name: "O que você procura?" }),
    "Interestelar",
  );
  await user.click(screen.getByRole("button", { name: "Encontrar" }));
  await screen.findByRole("button", { name: "Ver detalhes: Interestelar" });
}
describe("search and watchlist", () => {
  test("renders the bilingual landing page, themes and an empty watchlist", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Sua próxima cena",
    );
    await user.click(screen.getByRole("button", { name: "Usar tema claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Idioma" }),
      "en",
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Your next scene",
    );
    await user.click(screen.getByRole("button", { name: /Watchlist/ }));
    expect(
      screen.getByText("Your watchlist starts with a discovery."),
    ).toBeTruthy();
  });
  test("searches, filters films and saves a title without losing identity", async () => {
    const user = userEvent.setup();
    render(<App />);
    await search(user);
    await user.click(
      screen.getByRole("button", { name: "Filmes", exact: true }),
    );
    expect(
      screen.queryByRole("button", { name: "Ver detalhes: Uma série" }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", {
        name: "Adicionar à minha lista: Interestelar",
      }),
    );
    await user.click(screen.getByRole("button", { name: /Minha lista/ }));
    expect(
      screen.getByRole("button", { name: "Ver detalhes: Interestelar" }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", {
        name: "Remover da minha lista: Interestelar",
      }),
    );
    expect(
      screen.getByText("Sua lista começa com uma descoberta."),
    ).toBeTruthy();
  });
  test("loads details only when opened and renders provider links", async () => {
    const user = userEvent.setup();
    render(<App />);
    await search(user);
    expect(request.mock.calls.some(([p]) => p.startsWith("/titles"))).toBe(
      false,
    );
    await user.click(
      screen.getByRole("button", { name: "Ver detalhes: Interestelar" }),
    );
    await screen.findByText("Cooper");
    expect(
      screen.getByRole("link", { name: /Netflix/ }).getAttribute("href"),
    ).toBe("https://netflix.com");
    await user.click(screen.getByRole("button", { name: "Fechar detalhes" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  test("supports keyboard autocomplete and cancellation", async () => {
    request.mockImplementation((path) =>
      Promise.resolve(path.startsWith("/suggestions") ? [movie] : details),
    );
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole("combobox", { name: "O que você procura?" });
    await user.type(input, "Inter");
    await screen.findByRole("option", { name: /Interestelar/ });
    await user.keyboard("{ArrowDown}{Enter}");
    await screen.findByRole("dialog");
    expect(input.value).toBe("Interestelar");
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { bubbles: true }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  test("shows retry after a server failure", async () => {
    request.mockRejectedValue(
      Object.assign(Error("offline"), { code: "CONNECTION" }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByRole("combobox", { name: "O que você procura?" }),
      "Film",
    );
    await user.click(screen.getByRole("button", { name: "Encontrar" }));
    await screen.findByRole("alert");
    request.mockResolvedValue([movie]);
    await user.click(screen.getByRole("button", { name: /Tentar novamente/ }));
    await screen.findByRole("button", { name: "Ver detalhes: Interestelar" });
  });
  test("does not crash when previous browser data is corrupt", () => {
    localStorage.setItem("shotfinder_saved", "{broken");
    localStorage.setItem("shotfinder_history_v2", "{}");
    expect(() => render(<App />)).not.toThrow();
  });
});
