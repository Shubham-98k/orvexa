const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the selected image.'));
  reader.readAsDataURL(blob);
});

export const compressImageFile = async (file, { maxDimension = 1600, maxBytes = 1_500_000 } = {}) => {
  if (!file || !SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.84, 0.74, 0.64, 0.54, 0.44]) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (!blob) throw new Error('Unable to compress the selected image.');
      if (blob.size <= maxBytes) return await readAsDataUrl(blob);
    }

    throw new Error('This image is too large to upload. Choose a smaller image.');
  } finally {
    bitmap.close();
  }
};
