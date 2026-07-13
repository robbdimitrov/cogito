export async function resizeImageForUpload(file: File): Promise<File> {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Unsupported image format");
  }

  const MAX_SIZE = 900 * 1024; // 900KB
  if (file.size <= MAX_SIZE) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Max side 1600px
      const MAX_SIDE = 1600;
      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width > height) {
          height = Math.round((height * MAX_SIDE) / width);
          width = MAX_SIDE;
        } else {
          width = Math.round((width * MAX_SIDE) / height);
          height = MAX_SIDE;
        }
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Failed to get canvas context"));
      }

      let scale = 1.0;
      const MIN_DIMENSION = 320;

      const attemptCompression = () => {
        const currentWidth = Math.round(width * scale);
        const currentHeight = Math.round(height * scale);

        canvas.width = currentWidth;
        canvas.height = currentHeight;

        ctx.clearRect(0, 0, currentWidth, currentHeight);
        // Draw white background in case of transparent PNG/WEBP/GIF converted to JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, currentWidth, currentHeight);
        ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

        let quality = 0.88;
        const MIN_QUALITY = 0.59; // to include 0.6 because of floating point
        const STEP = 0.08;

        const checkQuality = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error("Failed to create blob"));
              }

              if (blob.size <= MAX_SIZE) {
                const newFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, "") + ".jpeg",
                  {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  },
                );
                return resolve(newFile);
              }

              quality -= STEP;
              if (quality >= MIN_QUALITY) {
                checkQuality();
              } else if (
                currentWidth <= MIN_DIMENSION ||
                currentHeight <= MIN_DIMENSION
              ) {
                return reject(
                  new Error(
                    "Image cannot be compressed under 900KB without falling below 320px",
                  ),
                );
              } else {
                scale *= 0.85;
                attemptCompression();
              }
            },
            "image/jpeg",
            Math.max(quality, 0.1),
          );
        };

        checkQuality();
      };

      attemptCompression();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}
