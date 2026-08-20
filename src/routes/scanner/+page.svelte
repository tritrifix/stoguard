<script lang="ts">
	import { goto } from '$app/navigation';
	import BasculeTheme from '$lib/components/BasculeTheme.svelte';

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

<div class="ecran">
	<header>
		<a class="retour" href="/" aria-label="Retour au stock">
			<svg width="10" height="16" viewBox="0 0 12 20" fill="none" aria-hidden="true">
				<path
					d="M10 2L2 10l8 8"
					stroke="currentColor"
					stroke-width="2.4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</a>
		<h1>Scanner</h1>
		<BasculeTheme compact />
	</header>

	<div class="apercu">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={videoEl} class:visible={etat === 'pret'} playsinline muted></video>

		{#if etat === 'pret'}
			<div class="reticule" aria-hidden="true">
				<span class="coin hg"></span>
				<span class="coin hd"></span>
				<span class="coin bg"></span>
				<span class="coin bd"></span>
			</div>
			<p class="consigne">Place le code-barre dans le cadre</p>
		{:else if etat === 'demarrage'}
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
			<p class="message">Impossible d'accéder à la caméra. Utilise la saisie manuelle.</p>
		{/if}

		{#if cameras.length > 1}
			<div class="pastille-camera">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<rect x="3" y="7" width="4" height="10" rx="1" fill="#fff" />
					<rect x="9" y="4" width="2" height="16" rx="1" fill="#fff" />
					<rect x="14" y="7" width="3" height="10" rx="1" fill="#fff" />
					<rect x="19" y="4" width="2" height="16" rx="1" fill="#fff" />
				</svg>
				<label class="sr-only" for="choix-camera">Caméra</label>
				<select
					id="choix-camera"
					value={cameraActive}
					onchange={(e) => changerCamera(e.currentTarget.value)}
				>
					{#each cameras as camera, i (camera.deviceId)}
						<option value={camera.deviceId}>{camera.label || `Caméra ${i + 1}`}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	<div class="bas">
		<a class="manuel" href="/ajouter">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.8" />
				<path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			</svg>
			Saisir manuellement
		</a>
	</div>
</div>

<style>
	.ecran {
		display: flex;
		flex-direction: column;
		/* Le viseur occupe la hauteur disponible : la barre de navigation est
		   masquée sur cet écran, le padding du layout est donc le seul retrait. */
		min-height: calc(100vh - 3.25rem);
	}

	header {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
		margin-bottom: 8px;
	}

	.retour {
		width: 40px;
		height: 40px;
		border-radius: 999px;
		background: var(--puce-fond);
		border: 1px solid var(--puce-bordure);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--texte);
	}

	h1 {
		flex: 1;
		font-weight: 700;
		font-size: 19px;
		text-align: center;
		margin: 0;
	}

	.apercu {
		position: relative;
		flex: 1;
		min-height: 340px;
		border-radius: var(--rayon-pilule);
		overflow: hidden;
		background: linear-gradient(160deg, #1a1a22, #05050a 70%);
		display: flex;
		align-items: center;
		justify-content: center;
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

	.reticule {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 78%;
		height: 34%;
		pointer-events: none;
	}

	.coin {
		position: absolute;
		width: 30px;
		height: 30px;
		opacity: 0.9;
	}

	.hg {
		top: 0;
		left: 0;
		border-top: 3px solid #fff;
		border-left: 3px solid #fff;
		border-radius: 8px 0 0 0;
	}

	.hd {
		top: 0;
		right: 0;
		border-top: 3px solid #fff;
		border-right: 3px solid #fff;
		border-radius: 0 8px 0 0;
	}

	.bg {
		bottom: 0;
		left: 0;
		border-bottom: 3px solid #fff;
		border-left: 3px solid #fff;
		border-radius: 0 0 0 8px;
	}

	.bd {
		bottom: 0;
		right: 0;
		border-bottom: 3px solid #fff;
		border-right: 3px solid #fff;
		border-radius: 0 0 8px 0;
	}

	.consigne {
		position: absolute;
		bottom: 20px;
		left: 0;
		right: 0;
		text-align: center;
		color: rgba(255, 255, 255, 0.75);
		font-size: 12px;
		margin: 0;
		pointer-events: none;
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
		margin: 0;
	}

	/* Le sélecteur de caméra vit dans la pastille : sur un viseur plein
	   écran, un champ séparé au-dessus mangeait de la hauteur utile. */
	.pastille-camera {
		position: absolute;
		top: 16px;
		right: 16px;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 999px;
		padding: 6px 12px;
		display: flex;
		align-items: center;
		gap: 6px;
		max-width: calc(100% - 32px);
	}

	.pastille-camera select {
		background: none;
		border: none;
		color: #fff;
		font-family: inherit;
		/* 16px minimum : en dessous, Safari/Chrome Android zooment au focus. */
		font-size: 16px;
		max-width: 150px;
		padding: 0;
	}

	.pastille-camera option {
		color: #000;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.bas {
		flex-shrink: 0;
		padding-top: 14px;
	}

	.manuel {
		width: 100%;
		box-sizing: border-box;
		min-height: 50px;
		border-radius: 16px;
		background: var(--tuile-fond);
		backdrop-filter: blur(22px) saturate(180%);
		-webkit-backdrop-filter: blur(22px) saturate(180%);
		border: 1px solid var(--tuile-bordure);
		box-shadow: var(--tuile-ombre);
		color: var(--texte);
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
</style>
