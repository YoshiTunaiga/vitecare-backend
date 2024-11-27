// Recommended native method
export const decodeBase64 = (str) => {
  return Buffer.from(str, "base64").toString("utf-8");
};
