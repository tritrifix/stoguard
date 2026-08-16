<script lang="ts">
	import { goto } from '$app/navigation';

	type Etat = 'demarrage' | 'pret' | 'non-supporte' | 'refuse' | 'absente' | 'erreur';

	let etat = $state<Etat>('demarrage');
	let videoEl: HTMLVideoElement | undefined = $state();

	const INTERVALLE_DETECTION_MS = 400;

	$effect(() => {
		if (!('BarcodeDetector' in window) || window.BarcodeDetector === undefined) {
			etat = 'non-supporte';
			return;
		}

		let flux: MediaStream | null = null;
		let idIntervalle: ReturnType<typeof setInterval> | undefined;
		let detectionEnCours = false;
		let demonte = false;

		function arreterFlux() {
			if (idIntervalle !== undefined) {
				clearInterval(idIntervalle);
				idIntervalle = undefined;
			}
			if (flux) {
				// Une caméra qui reste allumée en arrière-plan sur un téléphone,
				// c'est le voyant qui reste vert et la batterie qui fond : on
				// arrête chaque piste explicitement, pas seulement la référence.
				flux.getTracks().forEach((piste) => piste.stop());
				flux = null;
			}
		}

		async function detecter(detecteur: BarcodeDetector) {
			if (detectionEnCours || !videoEl || videoEl.readyState < 2) return;
			detectionEnCours = true;
			try {
				const codes = await detecteur.detect(videoEl);
				if (codes.length > 0 && !demonte) {
					const ean = codes[0].rawValue;
					arreterFlux();
					await goto(`/ajouter?ean=${encodeURIComponent(ean)}`);
				}
			} catch {
				// Image de la frame illisible pour ce cycle : on retente au
				// prochain intervalle plutôt que d'interrompre le scan.
			} finally {
				detectionEnCours = false;
			}
		}

		(async () => {
			try {
				flux = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' }
				});

				if (demonte) {
					flux.getTracks().forEach((piste) => piste.stop());
					return;
				}

				if (videoEl) videoEl.srcObject = flux;
				await videoEl?.play();
				etat = 'pret';

				const detecteur = new BarcodeDetector({ formats: ['ean_13', 'ean_8'] });
				idIntervalle = setInterval(() => detecter(detecteur), INTERVALLE_DETECTION_MS);
			} catch (erreur) {
				if (erreur instanceof DOMException && erreur.name === 'NotAllowedError') {
					etat = 'refuse';
				} else if (erreur instanceof DOMException && erreur.name === 'NotFoundError') {
					etat = 'absente';
				} else {
					etat = 'erreur';
				}
			}
		})();

		return () => {
			demonte = true;
			arreterFlux();
		};
	});
</script>

<svelte:head><title>Scanner un code-barre — Stoguard</title></svelte:head>

<header>
	<a class="retour" href="/">← Stock</a>
	<h1>Scanner</h1>
</header>

<div class="apercu">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video bind:this={videoEl} class:visible={etat === 'pret'} playsinline muted></video>

	{#if etat === 'demarrage'}
		<p class="message">Démarrage de la caméra…</p>
	{:else if etat === 'non-supporte'}
		<p class="message">
			Le scan n'est pas pris en charge par ce navigateur. Utilise la saisie manuelle.
		</p>
	{:else if etat === 'refuse'}
		<p class="message">
			Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, ou utilise la saisie
			manuelle.
		</p>
	{:else if etat === 'absente'}
		<p class="message">Aucune caméra détectée sur cet appareil. Utilise la saisie manuelle.</p>
	{:else if etat === 'erreur'}
		<p class="message">
			Impossible d'accéder à la caméra. Utilise la saisie manuelle.
		</p>
	{/if}
</div>

<a class="manuel" href="/ajouter">Saisir manuellement</a>

<style>
	header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 1.25rem;
		margin: 0;
	}

	.retour {
		color: #1f6feb;
		text-decoration: none;
		font-weight: 600;
		white-space: nowrap;
	}

	.apercu {
		position: relative;
		/* Déborde du padding du layout pour un aperçu bord à bord sur mobile. */
		margin: 0 -0.75rem;
		aspect-ratio: 3 / 4;
		background: #000;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		visibility: hidden;
	}

	video.visible {
		visibility: visible;
	}

	.message {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 1.5rem;
		color: #fff;
		font-size: 0.95rem;
		background: rgba(0, 0, 0, 0.4);
	}

	.manuel {
		display: block;
		text-align: center;
		margin-top: 1.25rem;
		min-height: 48px;
		line-height: 48px;
		font-size: 1rem;
		font-weight: 600;
		border-radius: 8px;
		border: 1px solid #d0d7de;
		color: #1f6feb;
		text-decoration: none;
	}
</style>
