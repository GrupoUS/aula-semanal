// @ts-check

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: "https://aula-semanal.vercel.app",

	fonts: [
		{
			name: "Abhaya Libre",
			cssVariable: "--font-abhaya",
			provider: fontProviders.google(),
			weights: [400, 800],
			styles: ["normal"],
		},
		{
			// Face de título do canon OTB. 800 é o peso de display: Sora é uma
			// grotesca geométrica e precisa do peso alto + tracking negativo
			// (declarado no @theme) para carregar hierarquia sem serifa.
			name: "Sora",
			cssVariable: "--font-sora",
			provider: fontProviders.google(),
			weights: [400, 600, 700, 800],
			styles: ["normal"],
		},
		{
			name: "Inter",
			cssVariable: "--font-inter",
			provider: fontProviders.google(),
			weights: [200, 300, 400, 500, 600, 700],
			styles: ["normal"],
		},
	],

	integrations: [
		react(),
		sitemap({
			// O painel é interno: não pode ser indexado nem aparecer no sitemap.
			// AdminLayout já emite noindex, mas sitemap + noindex é sinal
			// contraditório para o crawler — melhor nem listar.
			filter: (page) => !new URL(page).pathname.startsWith("/admin"),
			serialize(item) {
				const pathname = new URL(item.url).pathname.replace(/\/$/, "") || "/";

				/** @type {Record<string, { priority: number; changefreq: string }>} */
				const config = {
					"/": { priority: 1.0, changefreq: "weekly" },
					"/termos": { priority: 0.3, changefreq: "yearly" },
					"/politica-de-privacidade": { priority: 0.3, changefreq: "yearly" },
				};

				const entry = config[pathname];
				if (entry) {
					item.priority = entry.priority;
					item.changefreq = /** @type {any} */ (entry.changefreq);
				}

				return item;
			},
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},

	adapter: vercel(),
});
