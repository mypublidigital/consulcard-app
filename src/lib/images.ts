/**
 * Imagens coladas ou anexadas no co-piloto (item 2).
 *
 * Reduz no navegador antes de enviar: o modelo não ganha nada com imagens
 * maiores que ~1.568 px no lado maior, e um print de tela 4K em base64 pesaria
 * vários MB na requisição.
 */
export interface ImageAttachment {
  id: string;
  name: string;
  mediaType: "image/jpeg" | "image/png";
  /** Base64 sem o prefixo data:. */
  data: string;
  previewUrl: string;
}

const MAX_EDGE = 1568;
export const MAX_IMAGES_PER_MESSAGE = 5;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    img.src = src;
  });
}

export async function toImageAttachment(file: File | Blob, name = "imagem"): Promise<ImageAttachment> {
  if (!file.type.startsWith("image/")) throw new Error(`"${name}" não é uma imagem.`);

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Navegador sem suporte a canvas.");
    // Fundo branco: PNG transparente convertido para JPEG ficaria preto.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // PNG preserva texto de print de tela; se ficar pesado, cai para JPEG.
    let mediaType: ImageAttachment["mediaType"] = "image/png";
    let dataUrl = canvas.toDataURL("image/png");
    if (dataUrl.length > 1_500_000) {
      mediaType = "image/jpeg";
      dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    }
    return {
      id: crypto.randomUUID(),
      name,
      mediaType,
      data: dataUrl.slice(dataUrl.indexOf(",") + 1),
      previewUrl: dataUrl,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
