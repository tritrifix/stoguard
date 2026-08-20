<script lang="ts">
	import { goto } from '$app/navigation';

	type Etat = 'demarrage' | 'pret' | 'non-supporte' | 'refuse' | 'absente' | 'erreur';

	const CLE_CAMERA_PREFEREE = 'stoguard:camera-preferee';
	const INTERVALLE_DETECTION_MS = 400;

	let etat = $state<Etat>('demarrage');
	let videoEl: HTMLVideoElement | undefined = $state();
	let cameras = $state<MediaDeviceInfo[]>([]);
	let cameraActive = $state('');

	// État de fonctionnement du scan, en dehors du $state : rien ici n'a
	// besoin d'être réactif, seul l'affichage (etat, cameras, cameraActive)
	// en a besoin.
	let flux: MediaStream | null = null;
	let idIntervalle: ReturnType<typeof setInterval> | undefined;
	let detecteur: BarcodeDetector | undefined;
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
			// arrête chaque piste explicitement avant d'en ouvrir une autre.
			flux.getTracks().forEach((piste) => piste.stop());
			flux = null;
		}
	}

	async function detecter() {
		if (!detecteur || detectionEnCours || !videoEl || videoEl.readyState < 2) return;
		detectionEnCours = true;
		try {
			const codes = await detecteur.detect(videoEl);
			if (codes.length > 0 && !demonte) {
				const ean = codes[0].rawValue;

				// Rien n'indiquait sinon qu'un code venait d'être détecté avant
				// la redirection : vibration si le navigateur la permet, et
				// image de la caméra gelée un court instant en confirmation
				// visuelle avant de couper le flux.
				if ('vibrate' in navigator) navigator.vibrate(100);
				videoEl.pause();
				await new Promise((resolve) => setTimeout(resolve, 400));

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

	/**
	 * Ouvre la caméra demandée (deviceId précis) ou, à défaut, la caméra
	 * arrière par défaut. Arrête proprement le flux précédent avant d'en
	 * ouvrir un nouveau, pour ne jamais laisser deux flux tourner en
	 * parallèle.
	 */
	async function ouvrirCamera(deviceId?: string) {
		arreterFlux();

		const contraintes: MediaStreamConstraints = deviceId
			? { video: { deviceId: { exact: deviceId } } }
			: { video: { facingMode: 'environment' } };

		try {
			flux = await navigator.mediaDevices.getUserMedia(contraintes);
		} catch (erreur) {
			// La caméra mémorisée (localStorage) n'existe plus, par exemple
			// après un changement d'appareil : on retombe proprement sur le
			// comportement par défaut plutôt que de rester bloqué en erreur.
			if (deviceId && erreur instanceof DOMException && erreur.name === 'OverconstrainedError') {
				localStorage.removeItem(CLE_CAMERA_PREFEREE);
				await ouvrirCamera();
				return;
			}
			throw erreur;
		}

		if (demonte) {
			flux.getTracks().forEach((piste) => piste.stop());
			return;
		}

		if (videoEl) videoEl.srcObject = flux;
		await videoEl?.play();
		etat = 'pret';
		cameraActive = flux.getVideoTracks()[0]?.getSettings().deviceId ?? '';

		if (idIntervalle === undefined) {
			idIntervalle = setInterval(detecter, INTERVALLE_DETECTION_MS);
		}
	}

	async function changerCamera(deviceId: string) {
		try {
			localStorage.setItem(CLE_CAMERA_PREFEREE, deviceId);
			await ouvrirCamera(deviceId);
		} catch {
			etat = 'erreur';
		}
	}

	$effect(() => {
		if (!('BarcodeDetector' in window) || window.BarcodeDetector === undefined) {
			etat = 'non-supporte';
			return;
		}

		detecteur = new BarcodeDetector({ formats: ['ean_13', 'ean_8'] });

		(async () => {
			try {
				// Les libellés (label) des caméras sont vides tant que
				// l'autorisation n'a pas été accordée : on ouvre donc d'abord
				// le flux (caméra mémorisée ou par défaut), et on énumère
				// seulement ensuite.
				const memorisee = localStorage.getItem(CLE_CAMERA_PREFEREE) ?? undefined;
				await ouvrirCamera(memorisee);

				if (demonte) return;

				const appareils = await navigator.mediaDevices.enumerateDevices();
				cameras = appareils.filter((a) => a.kind === 'videoinput');
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

{#if cameras.length > 1}
	<label class="choix-camera-label" for="choix-camera">Caméra</label>
	<select
		id="choix-camera"
		class="choix-camera"
		value={cameraActive}
		onchange={(e) => changerCamera(e.currentTarget.value)}
	>
		{#each cameras as camera, i (camera.deviceId)}
			<option value={camera.deviceId}>{camera.label || `Caméra ${i + 1}`}</option>
		{/each}
	</select>
{/if}

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
		color: var(--lien);
		text-decoration: none;
		font-weight: 600;
		white-space: nowrap;
	}

	.choix-camera-label {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--texte);
		margin-bottom: 0.3rem;
	}

	.choix-camera {
		/* 16px minimum : en dessous, Safari/Chrome Android zooment au focus. */
		font-size: 16px;
		padding: 0.5rem;
		border: 1px solid var(--bordure);
		border-radius: 8px;
		background: var(--surface);
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 0.75rem;
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
		border: 1px solid var(--bordure);
		color: var(--lien);
		text-decoration: none;
	}
</style>
