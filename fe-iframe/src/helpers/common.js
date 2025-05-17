// Convert base64 image to url and upload in aws s3 bucket
export const base64ToObjectURL = (base64String) => {
  // Extract the base64 data part if the string includes the data URI scheme
  let base64Data = base64String;

  // Check if the string includes the data URI scheme (e.g., "data:image/jpeg;base64,")
  if (base64String.includes(";base64,")) {
    base64Data = base64String.split(";base64,")[1];
  }

  // Decode the base64 string to binary data
  const binaryString = atob(base64Data);

  // Create an array buffer to hold the binary data
  const bytes = new Uint8Array(binaryString.length);

  // Fill the array with the binary data
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Determine the MIME type from the data URI if present
  let mimeType = "image/png"; // Default MIME type
  if (base64String.includes("data:")) {
    mimeType = base64String.split(":")[1].split(";")[0];
  }

  // Create a Blob from the array buffer with the appropriate MIME type
  const blob = new Blob([bytes], { type: mimeType });

  // Create and return an object URL for the Blob
  return URL.createObjectURL(blob);
};

export const isBase64Image = (str) => {
  // Check for data URI prefix
  const hasImagePrefix =
    /^data:image\/(jpeg|png|gif|bmp|webp|svg\+xml);base64,/.test(str);

  // If it has an image prefix, it's very likely a base64 image
  if (hasImagePrefix) {
    return true;
  }

  // No prefix, but could still be raw base64 data
  // Check if string contains only valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/=]+$/;

  // Base64 images tend to be long
  if (str.length > 100 && base64Regex.test(str)) {
    // Additional check: base64 strings typically have length divisible by 4
    return str.length % 4 === 0;
  }

  // Doesn't look like base64 image data
  return false;
};
