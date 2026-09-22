import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { GALLERY_KEYS } from "./lib/gallery";
import { ICON_KEYS } from "./lib/icons";
import { SPEAKER_KEYS } from "./lib/speakers";

/**
 * WhatsApp message SSOT (Cardinal #6): every pre-filled message must start with
 * "Olá, Laura!" so it routes to the SDR. whatsappUrlWithText enforces this at
 * runtime too — this refine fails the build early on content drift.
 */
const whatsappMessage = z.string().refine((m) => m.startsWith("Olá, Laura!"), {
	message: "WhatsApp message must start with 'Olá, Laura!' (SDR SSOT).",
});

const legalPage = z.object({
	title: z.string(),
	seoTitle: z.string(),
	description: z.string(),
	updated: z.string(),
	sections: z.array(
		z.object({
			title: z.string(),
			paragraphs: z.array(z.string()),
			items: z.array(z.string()).optional(),
		}),
	),
});

const products = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "./src/content/products" }),
	schema: z.object({
		slug: z.string(),
		version: z.string(),
		locale: z.literal("pt-BR"),

		seo: z.object({
			title: z.string().min(20).max(70),
			description: z.string().min(120).max(220),
			ogImage: z.string(),
			canonical: z.string().url().optional(),
		}),

		/** Recorrência confirmada; datas ISO e horário só quando definidos. */
		event: z.object({
			format: z.string(),
			date: z.string(),
			time: z.string().optional(),
			durationLabel: z.string().optional(),
			registrationNote: z.string().optional(),
			/** Optional ISO 8601 datetimes for Event JSON-LD (omit until confirmed). */
			startDateISO: z.string().optional(),
			endDateISO: z.string().optional(),
			attendanceMode: z.enum(["online", "offline", "mixed"]).optional(),
			/** Título/descrição do arquivo .ics gerado no estado de sucesso (reusa startDateISO). */
			calendarTitle: z.string().optional(),
			calendarDescription: z.string().optional(),
			/** Linha de contexto do sticky CTA. É copy de produto (formato e
			 *  gratuidade da aula), então não pode viver no componente. */
			stickyTitle: z.string().optional(),
		}),

		hero: z.object({
			eyebrow: z.string().optional(),
			/** Plate duplo da primeira dobra: exatamente 2 chaves de SPEAKER_KEYS.
			 *  Os nomes exibidos vêm de `faculty.lista`, nunca do componente. */
			duo: z.array(z.enum(SPEAKER_KEYS)).length(2).optional(),
			portraitAlt: z.string(),
			headline: z.string(),
			highlight: z.string().optional(),
			subheadline: z.string(),
			/** Campos mortos: nenhum componente renderiza. `badges` perdeu para os
			 *  eventChips do Hero e `background` para o import via astro:assets.
			 *  Mantidos opcionais para não quebrar conteúdo legado. */
			badges: z.array(z.string()).min(2).max(6).optional(),
			primaryCta: z.object({
				label: z.string(),
				href: z.string(),
			}),
			whatsapp: z.object({
				label: z.string(),
				message: whatsappMessage,
			}),
			background: z
				.object({
					image: z.string(),
					alt: z.string(),
				})
				.optional(),
			/** Faixa de microprovas/qualificação logo abaixo dos CTAs (fatos reais). */
			proofBar: z
				.object({
					items: z
						.array(
							z.object({
								icon: z.string().optional(),
								label: z.string(),
								note: z.string().optional(),
							}),
						)
						.min(2)
						.max(4),
				})
				.optional(),
		}),

		audience: z.object({
			headline: z.string(),
			subheadline: z.string().optional(),
			intro: z.string().optional(),
			items: z
				.array(
					z.object({
						label: z.string(),
						note: z.string().optional(),
						highlight: z.boolean().optional(),
					}),
				)
				.min(3),
			/** Qualificador "É para você se…" — fit positivo do público (transição de carreira). */
			forYou: z
				.object({
					title: z.string(),
					items: z
						.array(
							z.object({
								label: z.string(),
								note: z.string().optional(),
							}),
						)
						.min(2),
				})
				.optional(),
			/** Desqualificador "Não é para você se…" — filtra dono de clínica (Neon/Neon Dash). */
			notForYou: z
				.object({
					title: z.string(),
					items: z.array(z.object({ label: z.string() })).min(1),
				})
				.optional(),
		}),

		/** Seção de tensão que abre a narrativa de conversão (registro v2): nomeia
		 *  o teto antes de oferecer a saída. Copy = PROPOSTA até validação com a
		 *  Dra. Sacha — nada aqui pode afirmar resultado ou faturamento. */
		virada: z
			.object({
				eyebrow: z.string(),
				headline: z.string(),
				/** Segunda linha do H2, renderizada em gradiente gold. */
				highlight: z.string(),
				paragraph: z.string(),
				quote: z.string(),
				blockersTitle: z.string(),
				blockers: z
					.array(
						z.object({
							titulo: z.string(),
							descricao: z.string(),
						}),
					)
					.length(4),
			})
			.optional(),

		/** "O que você vai aprender" / agenda da aula (não o currículo do pós-grad). */
		learn: z.object({
			headline: z.string(),
			subheadline: z.string().optional(),
			topics: z
				.array(
					z.object({
						icon: z.string().optional(),
						titulo: z.string(),
						descricao: z.string(),
					}),
				)
				.min(3)
				.max(6),
		}),

		/** Mecanismo/fórmula do método (pilares interativos). Opcional. */
		mechanism: z
			.object({
				eyebrow: z.string().optional(),
				headline: z.string(),
				highlight: z.string().optional(),
				intro: z.string().optional(),
				formula: z.string().optional(),
				pillars: z
					.array(
						z.object({
							icon: z.string().optional(),
							titulo: z.string(),
							resumo: z.string().optional(),
							descricao: z.string(),
						}),
					)
					.min(2)
					.max(4),
			})
			.optional(),

		/** Quem conduz as aulas. Permite apresentação solo sem fabricar docentes. */
		faculty: z.object({
			eyebrow: z.string().optional(),
			headline: z.string(),
			highlight: z.string().optional(),
			subheadline: z.string().optional(),
			lista: z
				.array(
					z.object({
						nome: z.string(),
						area: z.string(),
						bio: z.string(),
						/** Chave do retrato (SPEAKER_KEYS). Enum, e não string livre: chave
						 *  inválida quebra o build em vez de sumir da página em silêncio. */
						foto: z.enum(SPEAKER_KEYS),
					}),
				)
				.min(1)
				.max(6),
		}),

		/** Bloco suave "OTB como próximo passo" — opcional. */
		nextStep: z
			.object({
				headline: z.string(),
				highlight: z.string().optional(),
				paragraphs: z.array(z.string()).min(1),
			})
			.optional(),

		/** Comparativo "sem método vs. com o método" — opcional. Linhas = PROPOSTA até validação. */
		comparison: z
			.object({
				eyebrow: z.string().optional(),
				headline: z.string(),
				highlight: z.string().optional(),
				subheadline: z.string().optional(),
				withoutLabel: z.string(),
				withLabel: z.string(),
				rows: z
					.array(
						z.object({
							without: z.string(),
							with: z.string(),
						}),
					)
					.min(2),
			})
			.optional(),

		registration: z.object({
			headline: z.string(),
			subheadline: z.string().optional(),
			submitLabel: z.string(),
			sendingLabel: z.string().optional(),
			successTitle: z.string(),
			successBody: z.string(),
			/**
			 * Estado de falha do endpoint. OBRIGATÓRIO: "Inscrição confirmada" só
			 * pode aparecer com gravação durável provada (`persisted: true` vindo
			 * de /api/inscricao), logo a landing nunca pode ficar sem copy de erro.
			 *
			 * Substitui o antigo `errorMessage`, que era declarado aqui, estava
			 * ausente do JSON e não era lido por nenhum componente. As mensagens de
			 * validação também migram para cá: estavam hardcoded no <script> do
			 * formulário, furando o SSOT de conteúdo.
			 */
			errorState: z.object({
				title: z.string(),
				body: z.string(),
				retryLabel: z.string(),
				whatsapp: z.object({ label: z.string(), message: whatsappMessage }),
				/** Resumo em #form-status quando a validação client-side falha. */
				validationSummary: z.string(),
				validation: z.object({
					name: z.string(),
					email: z.string(),
					phone: z.string(),
					consent: z.string(),
				}),
			}),
			consentText: z.string(),
			privacyHref: z.string(),
			privacyLabel: z.string(),
			requiredNote: z.string(),
			fields: z.object({
				nameLabel: z.string(),
				namePlaceholder: z.string().optional(),
				emailLabel: z.string(),
				emailPlaceholder: z.string().optional(),
				phoneLabel: z.string(),
				phonePlaceholder: z.string().optional(),
				professionLabel: z.string().optional(),
				professionPlaceholder: z.string().optional(),
				experienceLabel: z.string(),
				experiencePlaceholder: z.string(),
				experiencePayloadLabel: z.string(),
				experienceOptions: z.array(z.string()).min(1),
				revenueLabel: z.string(),
				revenuePlaceholder: z.string(),
				revenuePayloadLabel: z.string(),
				revenueOptions: z.array(z.string()).min(1),
			}),
			whatsappFallback: z.object({
				label: z.string(),
				message: whatsappMessage,
			}),
			/** Passos "como funciona" exibidos acima do formulário (fatos reais). */
			steps: z
				.array(z.object({ titulo: z.string(), descricao: z.string() }))
				.min(2)
				.max(4)
				.optional(),
			/** Estado de sucesso rico: grupo da aula + add-to-calendar + lembrete/conversa no WhatsApp. */
			successState: z
				.object({
					calendarLabel: z.string(),
					/** CTA do grupo de WhatsApp da aula (convite chat.whatsapp.com — não passa pelo helper wa.me). */
					group: z
						.object({
							title: z.string().optional(),
							description: z.string().optional(),
							label: z.string(),
							href: z.string().url().startsWith("https://chat.whatsapp.com/", {
								message: "Group href must be a chat.whatsapp.com invite link.",
							}),
						})
						.optional(),
					reminderLabel: z.string().optional(),
					reminderWhatsapp: z
						.object({ label: z.string(), message: whatsappMessage })
						.optional(),
					talkLabel: z.string().optional(),
					talkWhatsapp: z
						.object({ label: z.string(), message: whatsappMessage })
						.optional(),
				})
				.optional(),
		}),

		faqs: z
			.array(
				z.object({
					question: z.string(),
					answer: z.string(),
				}),
			)
			.min(3)
			.optional(),

		finalCta: z.object({
			headline: z.string(),
			subheadline: z.string().optional(),
			primaryLabel: z.string(),
			primaryHref: z.string(),
			whatsapp: z.object({
				label: z.string(),
				message: whatsappMessage,
			}),
		}),

		/** Faixa de fotos do acervo (marquee decorativo). Puramente ilustrativa:
		 *  o bloco inteiro é aria-hidden, mas cada `alt` continua obrigatório para
		 *  o caso de a faixa virar conteúdo navegável no futuro. */
		gallery: z
			.object({
				label: z.string(),
				photos: z
					.array(
						z.object({
							/** Chave do acervo (GALLERY_KEYS). Enum, e não string livre:
							 *  chave inválida quebra o build em vez de sumir da faixa. */
							key: z.enum(GALLERY_KEYS),
							alt: z.string().min(12),
						}),
					)
					.min(3)
					.max(8),
			})
			.optional(),

		/** Barra de transparência antes do CTA final. Cada item é um recorte
		 *  verificável do `legal.disclaimer` — proibido afirmar algo que não
		 *  esteja lá. `icon` é enum e não string livre: uma chave com typo
		 *  renderizaria um <svg> vazio com o build verde. */
		transparency: z
			.object({
				items: z
					.array(
						z.object({
							icon: z.enum(ICON_KEYS),
							title: z.string(),
							body: z.string(),
						}),
					)
					.length(3),
			})
			.optional(),

		shell: z.object({
			brand: z.object({
				name: z.string(),
				top: z.string(),
				main: z.string(),
				connector: z.string(),
				host: z.string(),
				homeLabel: z.string(),
			}),
			navigationLabel: z.string(),
			navigation: z.array(z.object({ label: z.string(), href: z.string() })),
			footerDescription: z.string(),
			copyright: z.string(),
			cookieLabel: z.string(),
			contactLabel: z.string(),
			instagramLabel: z.string(),
			organizationName: z.string(),
			organizationDescription: z.string(),
			adminLabel: z.string(),
			adminContactMessage: z.string(),
			homeLabel: z.string(),
			notFound: z.object({
				title: z.string(),
				description: z.string(),
				headline: z.string(),
				body: z.string(),
				backLabel: z.string(),
				whatsappLabel: z.string(),
				whatsappMessage,
			}),
		}),
		ticker: z.array(z.string()).min(3),
		legal: z.object({
			disclaimer: z.string().min(40),
			terms: legalPage,
			privacy: legalPage,
		}),
	}),
});

export const collections = { products };
