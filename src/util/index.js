export const getAssetsImage = (url) => {
  return new URL(`../assets/imgs/${url}`, import.meta.url).href;
};

export const getAssetsFile = (url) => {
  return new URL(`../assets/${url}`, import.meta.url).href;
};
