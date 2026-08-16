// L'API BarcodeDetector (Shape Detection API) n'est pas encore incluse dans
// les libs DOM de TypeScript. Déclaration minimale d'après la spécification :
// https://wicg.github.io/shape-detection-api/#barcode-detection-api
// Disponible sur Chrome Android (notre cible) ; absente ailleurs, d'où la
// détection de fonctionnalité obligatoire avant toute utilisation.

interface DetectedBarcode {
	readonly boundingBox: DOMRectReadOnly;
	readonly rawValue: string;
	readonly format: string;
	readonly cornerPoints: ReadonlyArray<{ x: number; y: number }>;
}

interface BarcodeDetectorOptions {
	formats: string[];
}

declare class BarcodeDetector {
	constructor(options?: BarcodeDetectorOptions);
	static getSupportedFormats(): Promise<string[]>;
	detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface Window {
	BarcodeDetector?: typeof BarcodeDetector;
}
