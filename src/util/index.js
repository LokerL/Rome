export const getAssetsImage = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return new URL(`../assets/imgs/${url}`, import.meta.url).href;
};

export const getAssetsFile = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return new URL(`../assets/${url}`, import.meta.url).href;
};
